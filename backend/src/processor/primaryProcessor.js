const logger = require('../utils/logger').createComponentLogger('processor');
const queueManager = require('../queue/queueManager');
const retryManager = require('../retry/retryManager');
const dlqRouter = require('../dlq/dlqRouter');
const circuitBreaker = require('../circuit-breaker/circuitBreaker');
const config = require('../utils/config');

class PrimaryProcessor {
  constructor() {
    this.isProcessing = false;
    this.processedCount = 0;
    this.failedCount = 0;
  }

  async initialize() {
    try {
      const queue = queueManager.getQueue();
      
      // Process messages with configured concurrency
      queue.process(config.queue.concurrency, async (job) => {
        return await this.processMessage(job.data);
      });

      this.isProcessing = true;
      logger.info('Primary processor initialized', { 
        concurrency: config.queue.concurrency 
      });
    } catch (error) {
      logger.error('Failed to initialize processor:', error);
      throw error;
    }
  }

  /**
   * Process a single message
   * @param {Object} message - Message to process
   * @returns {Object} Processing result
   */
  async processMessage(message) {
    const startTime = Date.now();
    const messageId = message.messageId;
    const retryCount = message.retryCount || 0;

    logger.info('Processing message', { messageId, retryCount });

    try {
      // Execute business logic
      const result = await this.executeBusinessLogic(message);

      // Record success
      await circuitBreaker.recordSuccess();
      this.processedCount++;

      const duration = Date.now() - startTime;
      logger.info('Message processed successfully', { 
        messageId, 
        duration,
        retryCount 
      });

      return { success: true, result, duration };

    } catch (error) {
      // Record failure
      await circuitBreaker.recordFailure();
      this.failedCount++;

      const duration = Date.now() - startTime;
      logger.error('Message processing failed', { 
        messageId, 
        retryCount,
        error: error.message,
        duration
      });

      // Get retry decision
      const decision = retryManager.getRetryDecision(retryCount, error);
      logger.info('Retry decision', { messageId, decision });

      if (decision.action === 'RETRY') {
        // Re-enqueue with delay and updated retry count
        await this.retryMessage(message, error, decision);
      } else {
        // Route to DLQ
        await this.routeToDLQ(message, error, decision);
      }

      throw error; // Re-throw to mark job as failed
    }
  }

  /**
   * Execute business logic (simulated)
   * @param {Object} message - Message to process
   * @returns {Object} Processing result
   */
  async executeBusinessLogic(message) {
    // Simulate processing time
    await this.sleep(Math.random() * 100 + 50);

    // Simulate different failure scenarios based on message data
    if (message.payload && message.payload.simulateError) {
      const errorType = message.payload.errorType || 'TIMEOUT_ERROR';
      
      switch (errorType) {
        case 'TIMEOUT_ERROR':
          throw new Error('External API timeout after 5000ms');
        case 'VALIDATION_ERROR':
          throw new Error('Invalid payload: missing required field');
        case 'RATE_LIMIT_ERROR':
          throw new Error('Rate limit exceeded: 429 Too Many Requests');
        case 'SERVICE_UNAVAILABLE':
          throw new Error('Service unavailable: 503');
        default:
          throw new Error('Unknown error occurred');
      }
    }

    // Successful processing
    return {
      processed: true,
      timestamp: new Date(),
      data: message.payload
    };
  }

  /**
   * Retry message with delay
   * @param {Object} message - Original message
   * @param {Error} error - The error that occurred
   * @param {Object} decision - Retry decision
   */
  async retryMessage(message, error, decision) {
    try {
      const updatedMessage = retryManager.createRetryMetadata(
        message, 
        error, 
        message.retryCount || 0
      );

      // Re-enqueue with delay
      await queueManager.enqueue(updatedMessage);

      logger.info('Message scheduled for retry', {
        messageId: message.messageId,
        retryCount: updatedMessage.retryCount,
        delay: decision.delay
      });
    } catch (error) {
      logger.error('Failed to retry message:', error);
      // If retry fails, route to DLQ
      await this.routeToDLQ(message, error, decision);
    }
  }

  /**
   * Route message to DLQ
   * @param {Object} message - Original message
   * @param {Error} error - The error that occurred
   * @param {Object} decision - Retry decision
   */
  async routeToDLQ(message, error, decision) {
    try {
      await dlqRouter.routeToDLQ(message, error, decision);
      
      logger.info('Message routed to DLQ', {
        messageId: message.messageId,
        reason: decision.reason,
        errorType: decision.errorType
      });
    } catch (dlqError) {
      logger.error('Failed to route message to DLQ:', dlqError);
      // Critical: message could be lost
      // In production, this should trigger alerts
    }
  }

  /**
   * Pause message processing
   */
  async pause() {
    try {
      const queue = queueManager.getQueue();
      await queue.pause();
      this.isProcessing = false;
      logger.info('Message processing paused');
    } catch (error) {
      logger.error('Failed to pause processing:', error);
    }
  }

  /**
   * Resume message processing
   */
  async resume() {
    try {
      const queue = queueManager.getQueue();
      await queue.resume();
      this.isProcessing = true;
      logger.info('Message processing resumed');
    } catch (error) {
      logger.error('Failed to resume processing:', error);
    }
  }

  /**
   * Get processor metrics
   */
  getMetrics() {
    return {
      isProcessing: this.isProcessing,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      successRate: this.processedCount > 0 
        ? (this.processedCount / (this.processedCount + this.failedCount))
        : 0
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new PrimaryProcessor();
