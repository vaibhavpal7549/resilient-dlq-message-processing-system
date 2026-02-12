/**
 * Retry Strategy Service
 * 
 * Implements various retry strategies for DLQ messages:
 * - Immediate retry with exponential backoff
 * - Scheduled retry for off-peak hours
 * - Manual intervention flagging
 */

const config = require('../config');
const { createComponentLogger } = require('../utils/logger');
const { calculateNextRetry, calculateOffPeakRetry, formatDuration } = require('../utils/helpers');
const { RetryStrategy } = require('./failureClassifier');

const logger = createComponentLogger('retry-strategy');

/**
 * Execute immediate retry strategy
 * Re-injects message to queue with exponential backoff
 * 
 * @param {Object} message - DLQ message
 * @param {Object} messageQueue - Bull queue instance
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Retry result
 */
async function executeImmediateRetry(message, messageQueue, workerId) {
    try {
        const { dlqRetryCount } = message;
        const backoffMinutes = config.dlq.retryBackoffMinutes;

        // Calculate next retry time
        const nextRetryAt = calculateNextRetry(dlqRetryCount, backoffMinutes);
        const delayMs = nextRetryAt - new Date();

        logger.info('Executing immediate retry', {
            messageId: message.messageId,
            dlqRetryCount,
            nextRetryAt,
            delayFormatted: formatDuration(delayMs)
        });

        // Re-inject to primary queue for processing
        const replayMessage = {
            messageId: `dlq_retry_${message.messageId}_${Date.now()}`,
            payload: message.originalMessage,
            source: message.metadata?.source || 'dlq',
            priority: message.metadata?.priority || 2,
            tags: [...(message.metadata?.tags || []), 'dlq_retry'],
            retryCount: 0,
            originalDLQId: message._id.toString()
        };

        // Add to queue (if queue is available)
        if (messageQueue) {
            await messageQueue.add(replayMessage, {
                delay: delayMs,
                attempts: 1,
                backoff: false
            });
            logger.debug('Message added to queue', { messageId: replayMessage.messageId });
        }

        // Update message state
        await message.scheduleRetry(nextRetryAt);

        // Add replay attempt record
        await message.addReplayAttempt({
            timestamp: new Date(),
            workerId,
            strategy: RetryStrategy.IMMEDIATE_RETRY,
            result: 'scheduled',
            notes: `Retry attempt ${dlqRetryCount + 1} scheduled for ${nextRetryAt.toISOString()}`
        });

        logger.info('Immediate retry scheduled successfully', {
            messageId: message.messageId,
            nextRetryAt,
            dlqRetryCount: message.dlqRetryCount
        });

        return {
            success: true,
            strategy: RetryStrategy.IMMEDIATE_RETRY,
            nextRetryAt,
            dlqRetryCount: message.dlqRetryCount
        };

    } catch (error) {
        logger.error('Failed to execute immediate retry', {
            messageId: message.messageId,
            error: error.message,
            stack: error.stack
        });

        // Release lock on error
        await message.releaseLock();

        return {
            success: false,
            strategy: RetryStrategy.IMMEDIATE_RETRY,
            error: error.message
        };
    }
}

/**
 * Execute scheduled retry strategy
 * Schedules message for retry during off-peak hours
 * 
 * @param {Object} message - DLQ message
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Retry result
 */
async function executeScheduledRetry(message, workerId) {
    try {
        const offPeakHour = config.dlq.offPeakHour;
        const nextRetryAt = calculateOffPeakRetry(offPeakHour);

        logger.info('Executing scheduled retry', {
            messageId: message.messageId,
            nextRetryAt,
            offPeakHour
        });

        // Update message state
        await message.scheduleRetry(nextRetryAt);

        // Add replay attempt record
        await message.addReplayAttempt({
            timestamp: new Date(),
            workerId,
            strategy: RetryStrategy.SCHEDULED_RETRY,
            result: 'scheduled',
            notes: `Scheduled for off-peak retry at ${nextRetryAt.toISOString()}`
        });

        logger.info('Scheduled retry set successfully', {
            messageId: message.messageId,
            nextRetryAt
        });

        return {
            success: true,
            strategy: RetryStrategy.SCHEDULED_RETRY,
            nextRetryAt,
            dlqRetryCount: message.dlqRetryCount
        };

    } catch (error) {
        logger.error('Failed to execute scheduled retry', {
            messageId: message.messageId,
            error: error.message
        });

        await message.releaseLock();

        return {
            success: false,
            strategy: RetryStrategy.SCHEDULED_RETRY,
            error: error.message
        };
    }
}

/**
 * Flag message for manual intervention
 * 
 * @param {Object} message - DLQ message
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Result
 */
async function flagForManualIntervention(message, workerId) {
    try {
        logger.warn('Flagging message for manual intervention', {
            messageId: message.messageId,
            errorType: message.errorType,
            dlqRetryCount: message.dlqRetryCount
        });

        // Mark as requiring manual intervention
        await message.markAsManual();

        // Add replay attempt record
        await message.addReplayAttempt({
            timestamp: new Date(),
            workerId,
            strategy: RetryStrategy.MANUAL_INTERVENTION,
            result: 'flagged',
            notes: 'Flagged for manual intervention due to unknown error type'
        });

        logger.warn('Message flagged for manual intervention', {
            messageId: message.messageId
        });

        // In production, send alert to operations team
        // await sendAlertToOps(message);

        return {
            success: true,
            strategy: RetryStrategy.MANUAL_INTERVENTION,
            status: 'dlq_manual'
        };

    } catch (error) {
        logger.error('Failed to flag message for manual intervention', {
            messageId: message.messageId,
            error: error.message
        });

        await message.releaseLock();

        return {
            success: false,
            strategy: RetryStrategy.MANUAL_INTERVENTION,
            error: error.message
        };
    }
}

/**
 * Mark message as permanently failed
 * 
 * @param {Object} message - DLQ message
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Result
 */
async function markAsPermanentlyFailed(message, workerId) {
    try {
        logger.warn('Marking message as permanently failed', {
            messageId: message.messageId,
            errorType: message.errorType,
            dlqRetryCount: message.dlqRetryCount
        });

        // Mark as permanently failed
        await message.markAsFailed();

        // Add replay attempt record
        await message.addReplayAttempt({
            timestamp: new Date(),
            workerId,
            strategy: RetryStrategy.MARK_AS_FAILED,
            result: 'failed',
            notes: `Permanently failed after ${message.dlqRetryCount} retry attempts`
        });

        logger.warn('Message marked as permanently failed', {
            messageId: message.messageId,
            totalRetries: message.dlqRetryCount
        });

        return {
            success: true,
            strategy: RetryStrategy.MARK_AS_FAILED,
            status: 'dlq_failed'
        };

    } catch (error) {
        logger.error('Failed to mark message as failed', {
            messageId: message.messageId,
            error: error.message
        });

        await message.releaseLock();

        return {
            success: false,
            strategy: RetryStrategy.MARK_AS_FAILED,
            error: error.message
        };
    }
}

/**
 * Execute retry strategy based on strategy type
 * 
 * @param {string} strategy - Retry strategy
 * @param {Object} message - DLQ message
 * @param {Object} messageQueue - Bull queue instance (optional)
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Execution result
 */
async function executeStrategy(strategy, message, messageQueue, workerId) {
    logger.info('Executing retry strategy', {
        messageId: message.messageId,
        strategy,
        dlqRetryCount: message.dlqRetryCount
    });

    switch (strategy) {
        case RetryStrategy.IMMEDIATE_RETRY:
            return await executeImmediateRetry(message, messageQueue, workerId);

        case RetryStrategy.SCHEDULED_RETRY:
            return await executeScheduledRetry(message, workerId);

        case RetryStrategy.MANUAL_INTERVENTION:
            return await flagForManualIntervention(message, workerId);

        case RetryStrategy.MARK_AS_FAILED:
            return await markAsPermanentlyFailed(message, workerId);

        default:
            logger.error('Unknown retry strategy', { strategy });
            return await flagForManualIntervention(message, workerId);
    }
}

module.exports = {
    executeImmediateRetry,
    executeScheduledRetry,
    flagForManualIntervention,
    markAsPermanentlyFailed,
    executeStrategy
};
