const DLQMessage = require('../db/models/DLQMessage');
const logger = require('../utils/logger').createComponentLogger('dlq-router');
const os = require('os');

class DLQRouter {
  constructor() {
    this.dlqCount = 0;
  }

  /**
   * Route failed message to Dead Letter Queue
   * @param {Object} message - Original message
   * @param {Error} error - The error that occurred
   * @param {Object} decision - Retry decision with error classification
   */
  async routeToDLQ(message, error, decision) {
    try {
      const messageId = message.messageId;
      const retryCount = message.retryCount || 0;
      const now = new Date();

      // Capture system state
      const systemState = this.captureSystemState();

      // Create DLQ message document
      const dlqMessage = new DLQMessage({
        messageId,
        originalMessage: message.payload || message,
        errorReason: error.message,
        errorStack: error.stack,
        errorType: decision.errorType || 'UNKNOWN_ERROR',
        retryCount,
        dlqRetryCount: 0,
        firstFailedAt: message.firstFailedAt || now,
        lastFailedAt: now,
        status: 'dlq_pending',
        nextRetryAt: new Date(Date.now() + 60000), // Default: retry in 1 minute
        metadata: {
          source: message.source || 'api',
          priority: message.priority || 2,
          tags: message.tags || [],
          requestHeaders: message.headers || {},
          systemState
        },
        replayAttempts: []
      });

      // Save to MongoDB
      await dlqMessage.save();
      this.dlqCount++;

      logger.info('Message persisted to DLQ', {
        messageId,
        errorType: decision.errorType,
        retryCount,
        dlqId: dlqMessage._id
      });

      // Emit DLQ event for monitoring
      this.emitDLQEvent(dlqMessage);

      return dlqMessage;

    } catch (error) {
      logger.error('Failed to route message to DLQ:', error);
      throw error;
    }
  }

  /**
   * Capture current system state
   * @returns {Object} System state snapshot
   */
  captureSystemState() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpuUsage: process.cpuUsage ? this.getCPUUsage() : 0,
      memoryUsage: usedMem / totalMem,
      totalMemoryMB: Math.round(totalMem / 1024 / 1024),
      usedMemoryMB: Math.round(usedMem / 1024 / 1024),
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  /**
   * Get CPU usage percentage
   * @returns {number} CPU usage (0-1)
   */
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 1 - idle / total;

    return Math.max(0, Math.min(1, usage));
  }

  /**
   * Emit DLQ event for monitoring/alerting
   * @param {Object} dlqMessage - DLQ message document
   */
  emitDLQEvent(dlqMessage) {
    // In production, this would send to monitoring system
    // For now, just log
    logger.warn('DLQ Event', {
      event: 'MESSAGE_TO_DLQ',
      messageId: dlqMessage.messageId,
      errorType: dlqMessage.errorType,
      retryCount: dlqMessage.retryCount,
      timestamp: new Date()
    });
  }

  /**
   * Get DLQ statistics
   * @returns {Object} DLQ stats
   */
  async getStats() {
    try {
      const [total, pending, processing, resolved, failed] = await Promise.all([
        DLQMessage.countDocuments(),
        DLQMessage.countDocuments({ status: 'dlq_pending' }),
        DLQMessage.countDocuments({ status: 'dlq_processing' }),
        DLQMessage.countDocuments({ status: 'dlq_resolved' }),
        DLQMessage.countDocuments({ status: 'dlq_failed' })
      ]);

      return {
        total,
        pending,
        processing,
        resolved,
        failed,
        routedInSession: this.dlqCount
      };
    } catch (error) {
      logger.error('Failed to get DLQ stats:', error);
      return null;
    }
  }
}

module.exports = new DLQRouter();
