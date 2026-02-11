require('dotenv').config();
const mongoose = require('mongoose');
const DLQMessage = require('../backend/src/db/models/DLQMessage');
const logger = require('../backend/src/utils/logger').createComponentLogger('dlq-worker');
const config = require('../backend/src/utils/config');
const Bull = require('bull');

class DLQWorker {
  constructor() {
    this.isRunning = false;
    this.workerId = `worker_${process.pid}_${Date.now()}`;
    this.pollInterval = config.dlq.pollIntervalMs;
    this.batchSize = config.dlq.batchSize;
    this.maxRetries = config.dlq.maxRetries;
    this.messageQueue = null;
  }

  async initialize() {
    try {
      logger.info('Initializing DLQ Worker...', { workerId: this.workerId });

      // Connect to MongoDB
      await mongoose.connect(config.mongodb.uri, {
        maxPoolSize: config.mongodb.poolSize
      });
      logger.info('MongoDB connected');

      // Initialize message queue for re-injection
      this.messageQueue = new Bull('message-processing', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db
        }
      });
      logger.info('Queue initialized');

      this.isRunning = true;
      logger.info('DLQ Worker initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize DLQ worker:', error);
      throw error;
    }
  }

  async start() {
    logger.info('Starting DLQ Worker polling...', {
      pollInterval: this.pollInterval,
      batchSize: this.batchSize
    });

    while (this.isRunning) {
      try {
        // Clear stale locks
        await this.clearStaleLocks();

        // Process pending messages
        await this.processPendingMessages();

        // Wait before next poll
        await this.sleep(this.pollInterval);

      } catch (error) {
        logger.error('Error in worker loop:', error);
        await this.sleep(5000); // Wait 5s on error
      }
    }
  }

  async clearStaleLocks() {
    try {
      const cleared = await DLQMessage.clearStaleLocks(300000); // 5 minutes
      if (cleared > 0) {
        logger.info(`Cleared ${cleared} stale locks`);
      }
    } catch (error) {
      logger.error('Failed to clear stale locks:', error);
    }
  }

  async processPendingMessages() {
    try {
      // Find pending messages ready for retry
      const messages = await DLQMessage.findPendingMessages(this.batchSize);

      if (messages.length === 0) {
        return;
      }

      logger.info(`Found ${messages.length} pending DLQ messages`);

      for (const message of messages) {
        await this.processMessage(message);
      }

    } catch (error) {
      logger.error('Failed to process pending messages:', error);
    }
  }

  async processMessage(message) {
    try {
      // Acquire lock
      await message.acquireLock(this.workerId);

      logger.info('Processing DLQ message', {
        messageId: message.messageId,
        dlqRetryCount: message.dlqRetryCount,
        errorType: message.errorType
      });

      // Determine retry strategy
      const strategy = this.selectRetryStrategy(message);

      if (strategy === 'IMMEDIATE_RETRY') {
        await this.immediateRetry(message);
      } else if (strategy === 'SCHEDULED_RETRY') {
        await this.scheduleRetry(message);
      } else if (strategy === 'MANUAL_INTERVENTION') {
        await this.flagForManual(message);
      } else {
        await this.markAsFailed(message);
      }

    } catch (error) {
      logger.error('Failed to process DLQ message:', error);
      
      // Release lock on error
      try {
        await message.releaseLock();
      } catch (releaseError) {
        logger.error('Failed to release lock:', releaseError);
      }
    }
  }

  selectRetryStrategy(message) {
    const { dlqRetryCount, errorType } = message;

    // Check if max retries exceeded
    if (dlqRetryCount >= this.maxRetries) {
      return 'MARK_AS_FAILED';
    }

    // Transient errors get immediate retry
    const transientErrors = ['TIMEOUT_ERROR', 'CONNECTION_ERROR', 'RATE_LIMIT_ERROR', 'SERVICE_UNAVAILABLE'];
    if (transientErrors.includes(errorType)) {
      return 'IMMEDIATE_RETRY';
    }

    // Unknown errors get manual intervention
    if (errorType === 'UNKNOWN_ERROR') {
      return 'MANUAL_INTERVENTION';
    }

    // Permanent errors marked as failed
    return 'MARK_AS_FAILED';
  }

  async immediateRetry(message) {
    try {
      // Calculate backoff: 1min, 5min, 15min, 30min, 60min
      const backoffMinutes = [1, 5, 15, 30, 60];
      const delayMinutes = backoffMinutes[Math.min(message.dlqRetryCount, backoffMinutes.length - 1)];

      // Re-inject to primary queue
      const replayMessage = {
        messageId: `dlq_retry_${message.messageId}_${Date.now()}`,
        payload: message.originalMessage,
        source: message.metadata.source,
        priority: message.metadata.priority,
        tags: [...(message.metadata.tags || []), 'dlq_retry'],
        retryCount: 0,
        originalDLQId: message._id
      };

      await this.messageQueue.add(replayMessage);

      // Update DLQ message
      message.dlqRetryCount++;
      message.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
      message.status = 'dlq_pending';
      message.lockedBy = null;
      message.lockedAt = null;

      await message.addReplayAttempt({
        timestamp: new Date(),
        workerId: this.workerId,
        strategy: 'immediate_retry',
        result: 'retried',
        notes: `Retry attempt ${message.dlqRetryCount}, next retry in ${delayMinutes} minutes`
      });

      logger.info('Message retried', {
        messageId: message.messageId,
        dlqRetryCount: message.dlqRetryCount,
        nextRetryAt: message.nextRetryAt
      });

    } catch (error) {
      logger.error('Failed to retry message:', error);
      await message.releaseLock();
    }
  }

  async scheduleRetry(message) {
    try {
      // Schedule for off-peak hours (2am, 3am, 4am)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);

      message.nextRetryAt = tomorrow;
      message.status = 'dlq_pending';
      message.lockedBy = null;
      message.lockedAt = null;

      await message.save();

      logger.info('Message scheduled for retry', {
        messageId: message.messageId,
        nextRetryAt: message.nextRetryAt
      });

    } catch (error) {
      logger.error('Failed to schedule retry:', error);
      await message.releaseLock();
    }
  }

  async flagForManual(message) {
    try {
      message.status = 'dlq_manual';
      message.lockedBy = null;
      message.lockedAt = null;

      await message.save();

      logger.warn('Message flagged for manual intervention', {
        messageId: message.messageId,
        errorType: message.errorType
      });

      // In production, send alert to operations team

    } catch (error) {
      logger.error('Failed to flag message:', error);
      await message.releaseLock();
    }
  }

  async markAsFailed(message) {
    try {
      await message.markAsFailed();

      logger.warn('Message marked as permanently failed', {
        messageId: message.messageId,
        dlqRetryCount: message.dlqRetryCount
      });

    } catch (error) {
      logger.error('Failed to mark message as failed:', error);
      await message.releaseLock();
    }
  }

  async stop() {
    logger.info('Stopping DLQ Worker...');
    this.isRunning = false;

    if (this.messageQueue) {
      await this.messageQueue.close();
    }

    await mongoose.connection.close();
    logger.info('DLQ Worker stopped');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start worker
const worker = new DLQWorker();

async function start() {
  try {
    await worker.initialize();
    await worker.start();
  } catch (error) {
    logger.error('Failed to start DLQ worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await worker.stop();
  process.exit(0);
});

if (require.main === module) {
  start();
}

module.exports = DLQWorker;
