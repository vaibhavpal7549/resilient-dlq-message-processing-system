const Queue = require('bull');
const logger = require('../utils/logger').createComponentLogger('queue');
const redisClient = require('../db/redis');
const config = require('../utils/config');

class QueueManager {
  constructor() {
    this.messageQueue = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        logger.info('Queue already initialized');
        return;
      }

      // Ensure Redis is connected
      await redisClient.connect();

      // Create Bull queue
      this.messageQueue = new Queue('message-processing', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db
        },
        defaultJobOptions: {
          attempts: 1, // We handle retries manually
          removeOnComplete: true,
          removeOnFail: false
        }
      });

      // Queue event handlers
      this.messageQueue.on('completed', (job, result) => {
        logger.info('Job completed', { jobId: job.id, messageId: job.data.messageId });
      });

      this.messageQueue.on('failed', (job, err) => {
        logger.error('Job failed', { 
          jobId: job.id, 
          messageId: job.data.messageId,
          error: err.message 
        });
      });

      this.messageQueue.on('stalled', (job) => {
        logger.warn('Job stalled', { jobId: job.id, messageId: job.data.messageId });
      });

      this.messageQueue.on('error', (error) => {
        logger.error('Queue error:', error);
      });

      this.isInitialized = true;
      logger.info('Queue initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue:', error);
      throw error;
    }
  }

  async enqueue(message) {
    try {
      if (!this.isInitialized) {
        throw new Error('Queue not initialized');
      }

      const job = await this.messageQueue.add(message, {
        jobId: message.messageId
      });

      logger.info('Message enqueued', { 
        jobId: job.id, 
        messageId: message.messageId 
      });

      return job;
    } catch (error) {
      logger.error('Failed to enqueue message:', error);
      throw error;
    }
  }

  async getQueueMetrics() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.messageQueue.getWaitingCount(),
        this.messageQueue.getActiveCount(),
        this.messageQueue.getCompletedCount(),
        this.messageQueue.getFailedCount(),
        this.messageQueue.getDelayedCount()
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed
      };
    } catch (error) {
      logger.error('Failed to get queue metrics:', error);
      return null;
    }
  }

  async cleanQueue() {
    try {
      await this.messageQueue.clean(5000, 'completed');
      await this.messageQueue.clean(86400000, 'failed'); // Keep failed jobs for 24 hours
      logger.info('Queue cleaned');
    } catch (error) {
      logger.error('Failed to clean queue:', error);
    }
  }

  getQueue() {
    return this.messageQueue;
  }

  async close() {
    try {
      if (this.messageQueue) {
        await this.messageQueue.close();
        logger.info('Queue closed');
      }
    } catch (error) {
      logger.error('Error closing queue:', error);
    }
  }
}

module.exports = new QueueManager();
