/**
 * Failure Classifier Service
 * 
 * Categorizes error types into TEMPORARY, PERMANENT, or MANUAL intervention required.
 * Determines appropriate retry strategies based on error classification.
 */

const config = require('../config');
const { createComponentLogger } = require('../utils/logger');

const logger = createComponentLogger('failure-classifier');

/**
 * Error categories
 */
const ErrorCategory = {
    TEMPORARY: 'TEMPORARY',     // Transient errors that should be retried
    PERMANENT: 'PERMANENT',     // Permanent errors that should not be retried
    MANUAL: 'MANUAL'           // Unknown errors requiring manual intervention
};

/**
 * Retry strategies
 */
const RetryStrategy = {
    IMMEDIATE_RETRY: 'IMMEDIATE_RETRY',           // Retry immediately with backoff
    SCHEDULED_RETRY: 'SCHEDULED_RETRY',           // Retry during off-peak hours
    MANUAL_INTERVENTION: 'MANUAL_INTERVENTION',   // Flag for manual review
    MARK_AS_FAILED: 'MARK_AS_FAILED'             // Permanently failed
};

/**
 * Classify error type into category
 * @param {string} errorType - Error type from DLQ message
 * @returns {string} Error category (TEMPORARY, PERMANENT, or MANUAL)
 */
function classifyError(errorType) {
    if (!errorType) {
        logger.warn('No error type provided, defaulting to MANUAL');
        return ErrorCategory.MANUAL;
    }

    const errorTypeUpper = errorType.toUpperCase();

    // Check if it's a temporary error
    if (config.errorClassification.temporary.some(err => errorTypeUpper.includes(err))) {
        return ErrorCategory.TEMPORARY;
    }

    // Check if it's a permanent error
    if (config.errorClassification.permanent.some(err => errorTypeUpper.includes(err))) {
        return ErrorCategory.PERMANENT;
    }

    // Check if it requires manual intervention
    if (config.errorClassification.manual.some(err => errorTypeUpper.includes(err))) {
        return ErrorCategory.MANUAL;
    }

    // Default to manual intervention for unknown errors
    logger.warn('Unknown error type, defaulting to MANUAL', { errorType });
    return ErrorCategory.MANUAL;
}

/**
 * Determine retry strategy based on message state
 * @param {Object} message - DLQ message object
 * @returns {string} Retry strategy
 */
function determineRetryStrategy(message) {
    const { dlqRetryCount, errorType } = message;
    const maxRetries = config.dlq.maxRetries;

    // Check if max retries exceeded
    if (dlqRetryCount >= maxRetries) {
        logger.info('Max retries exceeded, marking as failed', {
            messageId: message.messageId,
            dlqRetryCount,
            maxRetries
        });
        return RetryStrategy.MARK_AS_FAILED;
    }

    // Classify the error
    const category = classifyError(errorType);

    logger.debug('Error classified', {
        messageId: message.messageId,
        errorType,
        category,
        dlqRetryCount
    });

    // Determine strategy based on category
    switch (category) {
        case ErrorCategory.TEMPORARY:
            // Temporary errors get immediate retry with backoff
            return RetryStrategy.IMMEDIATE_RETRY;

        case ErrorCategory.PERMANENT:
            // Permanent errors should not be retried
            logger.info('Permanent error detected, marking as failed', {
                messageId: message.messageId,
                errorType
            });
            return RetryStrategy.MARK_AS_FAILED;

        case ErrorCategory.MANUAL:
            // Unknown errors require manual intervention
            logger.warn('Manual intervention required', {
                messageId: message.messageId,
                errorType
            });
            return RetryStrategy.MANUAL_INTERVENTION;

        default:
            logger.error('Unknown error category', { category });
            return RetryStrategy.MANUAL_INTERVENTION;
    }
}

/**
 * Check if error is retryable
 * @param {string} errorType - Error type
 * @returns {boolean} True if error is retryable
 */
function isRetryable(errorType) {
    const category = classifyError(errorType);
    return category === ErrorCategory.TEMPORARY;
}

/**
 * Get recommended action for error type
 * @param {string} errorType - Error type
 * @returns {Object} Recommended action details
 */
function getRecommendedAction(errorType) {
    const category = classifyError(errorType);

    const actions = {
        [ErrorCategory.TEMPORARY]: {
            action: 'retry',
            description: 'Temporary error - will retry with exponential backoff',
            userAction: 'No action required - system will auto-retry'
        },
        [ErrorCategory.PERMANENT]: {
            action: 'fail',
            description: 'Permanent error - message cannot be processed',
            userAction: 'Review message payload and fix data/configuration issues'
        },
        [ErrorCategory.MANUAL]: {
            action: 'review',
            description: 'Unknown error - requires manual investigation',
            userAction: 'Investigate error cause and determine appropriate action'
        }
    };

    return actions[category] || actions[ErrorCategory.MANUAL];
}

/**
 * Get error statistics
 * @param {Array} messages - Array of DLQ messages
 * @returns {Object} Error statistics by category
 */
function getErrorStatistics(messages) {
    const stats = {
        total: messages.length,
        temporary: 0,
        permanent: 0,
        manual: 0,
        byType: {}
    };

    messages.forEach(message => {
        const category = classifyError(message.errorType);

        switch (category) {
            case ErrorCategory.TEMPORARY:
                stats.temporary++;
                break;
            case ErrorCategory.PERMANENT:
                stats.permanent++;
                break;
            case ErrorCategory.MANUAL:
                stats.manual++;
                break;
        }

        // Count by specific error type
        stats.byType[message.errorType] = (stats.byType[message.errorType] || 0) + 1;
    });

    return stats;
}

module.exports = {
    ErrorCategory,
    RetryStrategy,
    classifyError,
    determineRetryStrategy,
    isRetryable,
    getRecommendedAction,
    getErrorStatistics
};
