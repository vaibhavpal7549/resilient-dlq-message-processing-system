/**
 * Message Processor Service
 * 
 * Core service for processing individual DLQ messages.
 * Handles lock acquisition, retry orchestration, and status updates.
 */

const { createComponentLogger } = require('../utils/logger');
const { determineRetryStrategy } = require('./failureClassifier');
const { executeStrategy } = require('./retryStrategy');

const logger = createComponentLogger('message-processor');

/**
 * Process a single DLQ message
 * 
 * @param {Object} message - DLQ message from MongoDB
 * @param {Object} messageQueue - Bull queue instance (optional)
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Processing result
 */
async function processMessage(message, messageQueue, workerId) {
    const startTime = Date.now();

    try {
        // Acquire lock on the message
        await message.acquireLock(workerId);

        logger.info('Processing DLQ message', {
            messageId: message.messageId,
            errorType: message.errorType,
            dlqRetryCount: message.dlqRetryCount,
            status: message.status
        });

        // Determine appropriate retry strategy
        const strategy = determineRetryStrategy(message);

        logger.debug('Retry strategy determined', {
            messageId: message.messageId,
            strategy
        });

        // Execute the retry strategy
        const result = await executeStrategy(strategy, message, messageQueue, workerId);

        const processingTime = Date.now() - startTime;

        logger.info('Message processed successfully', {
            messageId: message.messageId,
            strategy,
            result: result.success ? 'success' : 'failed',
            processingTimeMs: processingTime
        });

        return {
            success: true,
            messageId: message.messageId,
            strategy,
            processingTimeMs: processingTime,
            ...result
        };

    } catch (error) {
        const processingTime = Date.now() - startTime;

        logger.error('Failed to process DLQ message', {
            messageId: message.messageId,
            error: error.message,
            stack: error.stack,
            processingTimeMs: processingTime
        });

        // Release lock on error
        try {
            await message.releaseLock();
            logger.debug('Lock released after error', { messageId: message.messageId });
        } catch (releaseError) {
            logger.error('Failed to release lock', {
                messageId: message.messageId,
                error: releaseError.message
            });
        }

        return {
            success: false,
            messageId: message.messageId,
            error: error.message,
            processingTimeMs: processingTime
        };
    }
}

/**
 * Process a batch of DLQ messages
 * 
 * @param {Array} messages - Array of DLQ messages
 * @param {Object} messageQueue - Bull queue instance (optional)
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Batch processing results
 */
async function processBatch(messages, messageQueue, workerId) {
    const startTime = Date.now();
    const results = {
        total: messages.length,
        successful: 0,
        failed: 0,
        details: []
    };

    logger.info('Processing message batch', {
        batchSize: messages.length,
        workerId
    });

    // Process messages sequentially to avoid overwhelming the system
    for (const message of messages) {
        const result = await processMessage(message, messageQueue, workerId);

        if (result.success) {
            results.successful++;
        } else {
            results.failed++;
        }

        results.details.push(result);
    }

    const totalTime = Date.now() - startTime;

    logger.info('Batch processing completed', {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        totalTimeMs: totalTime,
        avgTimeMs: Math.round(totalTime / results.total)
    });

    return results;
}

module.exports = {
    processMessage,
    processBatch
};
