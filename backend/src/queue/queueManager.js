const logger = require('../utils/logger').createComponentLogger('queue');
const rabbitmqClient = require('./rabbitmq');
const config = require('../utils/config');

class QueueManager {
  constructor() {
    this.isInitialized = false;
    this.queueName = null;
    this._consumerTag = null;
    this._consumeHandler = null;
    this._concurrency = 1;
    this._reconnectListenerAttached = false;
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        logger.info('Queue already initialized');
        return;
      }

      this.queueName = config.queue.name;

      // Connect to RabbitMQ
      const channel = await rabbitmqClient.connect();

      // Assert that the queue exists (creates it if not)
      await channel.assertQueue(this.queueName, {
        durable: true,       // Survive broker restarts
        arguments: {
          'x-message-ttl': 86400000 // Messages expire after 24 hours
        }
      });

      // Listen for reconnection events to re-register consumer
      if (!this._reconnectListenerAttached) {
        rabbitmqClient.on('reconnected', async (newChannel) => {
          logger.info('RabbitMQ reconnected — re-initializing queue and consumer');
          try {
            // Re-assert queue on new channel
            await newChannel.assertQueue(this.queueName, {
              durable: true,
              arguments: {
                'x-message-ttl': 86400000
              }
            });

            // Re-start consuming if we had a handler registered
            if (this._consumeHandler) {
              this._consumerTag = null; // Old tag is stale
              await this._startConsuming(this._concurrency, this._consumeHandler);
              logger.info('Consumer re-registered after reconnection');
            }
          } catch (err) {
            logger.error('Failed to re-initialize after reconnection:', err);
          }
        });
        this._reconnectListenerAttached = true;
      }

      this.isInitialized = true;
      logger.info('Queue initialized successfully', { queueName: this.queueName });
    } catch (error) {
      logger.error('Failed to initialize queue:', error);
      throw error;
    }
  }

  async enqueue(message, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Queue not initialized');
      }

      const channel = rabbitmqClient.getChannel();
      const messageBuffer = Buffer.from(JSON.stringify(message));

      const publishOptions = {
        persistent: true,      // Survive broker restarts
        contentType: 'application/json',
        messageId: message.messageId,
        timestamp: Date.now()
      };

      // For retries with delay: use a single shared delay queue per delay bucket
      // to avoid creating too many queues on CloudAMQP free plan
      if (options.delay && options.delay > 0) {
        // Round delay to nearest bucket to reduce queue count
        // Buckets: 1s, 2s, 5s, 10s, 30s, 60s
        const bucketedDelay = this._bucketDelay(options.delay);
        const delayQueue = `${this.queueName}.delay.${bucketedDelay}`;

        try {
          await channel.assertQueue(delayQueue, {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': this.queueName,
              'x-message-ttl': bucketedDelay,
              'x-expires': bucketedDelay + 300000 // Auto-delete queue after TTL + 5 min
            }
          });
          channel.sendToQueue(delayQueue, messageBuffer, publishOptions);
        } catch (delayErr) {
          // If delay queue fails (e.g., CloudAMQP limits), fall back to direct enqueue
          logger.warn('Delay queue failed, enqueueing directly', {
            messageId: message.messageId,
            error: delayErr.message
          });
          channel.sendToQueue(this.queueName, messageBuffer, publishOptions);
        }
      } else {
        channel.sendToQueue(this.queueName, messageBuffer, publishOptions);
      }

      logger.info('Message enqueued', {
        messageId: message.messageId,
        delay: options.delay || 0
      });

      return { id: message.messageId };
    } catch (error) {
      logger.error('Failed to enqueue message:', error);
      throw error;
    }
  }

  /**
   * Bucket delay values to reduce the number of unique delay queues created.
   * This is important for CloudAMQP free plan which limits queue count.
   */
  _bucketDelay(delay) {
    const buckets = [1000, 2000, 5000, 10000, 30000, 60000];
    for (const bucket of buckets) {
      if (delay <= bucket) return bucket;
    }
    return 60000; // Max bucket
  }

  async getQueueMetrics() {
    try {
      if (!this.isInitialized) {
        return null;
      }

      const channel = rabbitmqClient.getChannel();
      const queueInfo = await channel.checkQueue(this.queueName);

      return {
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        waiting: queueInfo.messageCount,
        active: queueInfo.consumerCount,
        total: queueInfo.messageCount
      };
    } catch (error) {
      logger.error('Failed to get queue metrics:', error);
      return null;
    }
  }

  getQueue() {
    // Returns a queue-like object for backward compatibility with primaryProcessor
    return {
      process: (concurrency, handler) => {
        this._startConsuming(concurrency, handler);
      },
      pause: async () => {
        // Cancel consumer to pause
        if (this._consumerTag) {
          try {
            const channel = rabbitmqClient.getChannel();
            await channel.cancel(this._consumerTag);
          } catch { /* channel may be closed */ }
          this._consumerTag = null;
        }
      },
      resume: async () => {
        // Re-register consumer
        if (this._consumeHandler) {
          await this._startConsuming(this._concurrency, this._consumeHandler);
        }
      }
    };
  }

  async _startConsuming(concurrency, handler) {
    try {
      const channel = rabbitmqClient.getChannel();
      this._consumeHandler = handler;
      this._concurrency = concurrency;

      // Set prefetch to control concurrency
      await channel.prefetch(concurrency);

      const { consumerTag } = await channel.consume(this.queueName, async (msg) => {
        if (!msg) return;

        try {
          const data = JSON.parse(msg.content.toString());
          // Create a job-like object for compatibility
          const job = { id: data.messageId || msg.properties.messageId, data };
          await handler(job);
          channel.ack(msg);
        } catch (error) {
          logger.error('Message processing failed:', error);
          // Don't requeue to avoid infinite loops - the processor handles DLQ routing
          channel.nack(msg, false, false);
        }
      });

      this._consumerTag = consumerTag;
      logger.info('Started consuming messages', { queueName: this.queueName, concurrency });
    } catch (error) {
      logger.error('Failed to start consuming:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this._consumerTag) {
        try {
          const channel = rabbitmqClient.getChannel();
          await channel.cancel(this._consumerTag);
        } catch (e) {
          // Channel may already be closed
        }
        this._consumerTag = null;
      }
      await rabbitmqClient.disconnect();
      this.isInitialized = false;
      logger.info('Queue closed');
    } catch (error) {
      logger.error('Error closing queue:', error);
    }
  }
}

module.exports = new QueueManager();
