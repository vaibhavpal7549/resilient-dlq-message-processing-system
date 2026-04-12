const logger = require('../utils/logger').createComponentLogger('queue');
const rabbitmqClient = require('./rabbitmq');
const config = require('../utils/config');

class QueueManager {
  constructor() {
    this.isInitialized = false;
    this.queueName = null;
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

      // If delay is specified, use RabbitMQ delayed message via TTL + dead letter
      // For simplicity, we publish directly (delay is handled by retry scheduling)
      if (options.delay && options.delay > 0) {
        // Create a temporary queue with TTL that forwards to main queue
        const delayQueue = `${this.queueName}.delay.${options.delay}`;
        await channel.assertQueue(delayQueue, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': this.queueName,
            'x-message-ttl': options.delay,
            'x-expires': options.delay + 60000 // Auto-delete queue after TTL + 1 min
          }
        });
        channel.sendToQueue(delayQueue, messageBuffer, publishOptions);
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
          const channel = rabbitmqClient.getChannel();
          await channel.cancel(this._consumerTag);
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
