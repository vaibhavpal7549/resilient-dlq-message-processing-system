const logger = require('../utils/logger').createComponentLogger('retry-manager');
const config = require('../utils/config');

class RetryManager {
  constructor() {
    this.retryPolicies = config.retryPolicies;
  }

  /**
   * Check if message should be retried
   * @param {number} retryCount - Current retry count
   * @returns {boolean}
   */
  shouldRetry(retryCount) {
    return retryCount < this.retryPolicies.maxRetries;
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @param {number} retryCount - Current retry count
   * @returns {number} Delay in milliseconds
   */
  calculateBackoff(retryCount) {
    // Base formula: delay = baseBackoffMs * (2 ^ retryCount)
    const baseDelay = this.retryPolicies.baseBackoffMs * Math.pow(2, retryCount);
    
    // Apply max backoff limit
    const cappedDelay = Math.min(baseDelay, this.retryPolicies.maxBackoffMs);
    
    // Add jitter (±jitterPercent%)
    const jitterPercent = this.retryPolicies.jitterPercent / 100;
    const jitterRange = cappedDelay * jitterPercent;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    
    const finalDelay = Math.max(0, Math.round(cappedDelay + jitter));
    
    logger.debug('Calculated backoff', {
      retryCount,
      baseDelay,
      cappedDelay,
      jitter,
      finalDelay
    });
    
    return finalDelay;
  }

  /**
   * Classify error type for routing decisions
   * @param {Error} error - The error object
   * @returns {string} Error classification
   */
  classifyError(error) {
    const errorMessage = error.message || '';
    const errorName = error.name || '';

    // Check transient errors
    const transientPatterns = [
      /timeout/i,
      /ETIMEDOUT/,
      /ECONNREFUSED/,
      /ECONNRESET/,
      /rate limit/i,
      /429/,
      /503/,
      /service unavailable/i
    ];

    for (const pattern of transientPatterns) {
      if (pattern.test(errorMessage) || pattern.test(errorName)) {
        return 'TRANSIENT_ERROR';
      }
    }

    // Check permanent errors
    const permanentPatterns = [
      /validation/i,
      /invalid/i,
      /400/,
      /401/,
      /403/,
      /404/,
      /not found/i,
      /unauthorized/i
    ];

    for (const pattern of permanentPatterns) {
      if (pattern.test(errorMessage) || pattern.test(errorName)) {
        return 'PERMANENT_ERROR';
      }
    }

    // Default to unknown
    return 'UNKNOWN_ERROR';
  }

  /**
   * Determine if error is transient and should be retried
   * @param {Error} error - The error object
   * @returns {boolean}
   */
  isTransientError(error) {
    const errorType = this.classifyError(error);
    return errorType === 'TRANSIENT_ERROR' || errorType === 'UNKNOWN_ERROR';
  }

  /**
   * Get retry decision for a message
   * @param {number} retryCount - Current retry count
   * @param {Error} error - The error that occurred
   * @returns {Object} Retry decision
   */
  getRetryDecision(retryCount, error) {
    const shouldRetry = this.shouldRetry(retryCount);
    const isTransient = this.isTransientError(error);
    const errorType = this.classifyError(error);

    if (!shouldRetry) {
      return {
        action: 'ROUTE_TO_DLQ',
        reason: 'MAX_RETRIES_EXCEEDED',
        errorType,
        delay: 0
      };
    }

    if (!isTransient) {
      return {
        action: 'ROUTE_TO_DLQ',
        reason: 'PERMANENT_ERROR',
        errorType,
        delay: 0
      };
    }

    const delay = this.calculateBackoff(retryCount);

    return {
      action: 'RETRY',
      reason: 'TRANSIENT_ERROR',
      errorType,
      delay,
      nextRetryCount: retryCount + 1
    };
  }

  /**
   * Create retry metadata for message
   * @param {Object} message - Original message
   * @param {Error} error - The error that occurred
   * @param {number} retryCount - Current retry count
   * @returns {Object} Enhanced message with retry metadata
   */
  createRetryMetadata(message, error, retryCount) {
    return {
      ...message,
      retryCount: retryCount + 1,
      lastError: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date()
      },
      retryHistory: [
        ...(message.retryHistory || []),
        {
          attempt: retryCount + 1,
          timestamp: new Date(),
          error: error.message
        }
      ]
    };
  }
}

module.exports = new RetryManager();
