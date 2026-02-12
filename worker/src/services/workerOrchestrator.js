/**
 * Worker Orchestrator Service
 * 
 * Main orchestration service for the DLQ worker.
 * Manages polling loop, batch retrieval, stale lock cleanup, and graceful shutdown.
 */

const Bull = require('bull');
const config = require('../config');
const { createComponentLogger } = require('../utils/logger');
const { sleep, generateWorkerId } = require('../utils/helpers');
const DLQMessage = require('../db/models/DLQMessage');
const { processBatch } = require('./messageProcessor');

const logger = createComponentLogger('worker-orchestrator');

/**
 * Worker Orchestrator Class
 */
class WorkerOrchestrator {
    constructor() {
        this.workerId = generateWorkerId();
        this.isRunning = false;
        this.messageQueue = null;
        this.pollInterval = config.dlq.pollIntervalMs;
        this.batchSize = config.dlq.batchSize;
        this.lockTimeout = config.dlq.lockTimeoutMs;
        this.stats = {
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0,
            startTime: null
        };
    }

    /**
     * Initialize the worker
     * Sets up message queue connection
     */
    async initialize() {
        try {
            logger.info('Initializing worker orchestrator', {
                workerId: this.workerId,
                pollInterval: this.pollInterval,
                batchSize: this.batchSize
            });

            // Initialize Bull queue for message re-injection
            this.messageQueue = new Bull('message-processing', {
                redis: {
                    host: config.redis.host,
                    port: config.redis.port,
                    password: config.redis.password || undefined,
                    db: config.redis.db
                },
                defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: false,
                    attempts: 1
                }
            });

            // Setup queue event handlers
            this.setupQueueEventHandlers();

            logger.info('Worker orchestrator initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize worker orchestrator', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Setup event handlers for the message queue
     */
    setupQueueEventHandlers() {
        this.messageQueue.on('error', (error) => {
            logger.error('Queue error', { error: error.message });
        });

        this.messageQueue.on('failed', (job, error) => {
            logger.error('Job failed', {
                jobId: job.id,
                error: error.message
            });
        });

        this.messageQueue.on('completed', (job) => {
            logger.debug('Job completed', { jobId: job.id });
        });
    }

    /**
     * Start the worker polling loop
     */
    async start() {
        this.isRunning = true;
        this.stats.startTime = new Date();

        logger.info('Starting worker polling loop', {
            workerId: this.workerId,
            pollInterval: this.pollInterval,
            batchSize: this.batchSize
        });

        // Main polling loop
        while (this.isRunning) {
            try {
                // Clear stale locks before processing
                await this.clearStaleLocks();

                // Process pending messages
                await this.processPendingMessages();

                // Wait before next poll
                await sleep(this.pollInterval);

            } catch (error) {
                logger.error('Error in worker loop', {
                    error: error.message,
                    stack: error.stack
                });

                // Wait before retrying on error
                await sleep(5000);
            }
        }

        logger.info('Worker polling loop stopped');
    }

    /**
     * Clear stale locks from messages
     * Releases locks that have been held longer than the timeout
     */
    async clearStaleLocks() {
        try {
            const cleared = await DLQMessage.clearStaleLocks(this.lockTimeout);

            if (cleared > 0) {
                logger.info('Cleared stale locks', {
                    count: cleared,
                    lockTimeoutMs: this.lockTimeout
                });
            }

        } catch (error) {
            logger.error('Failed to clear stale locks', {
                error: error.message
            });
        }
    }

    /**
     * Process pending DLQ messages
     * Retrieves and processes a batch of messages ready for retry
     */
    async processPendingMessages() {
        try {
            // Find pending messages ready for retry
            const messages = await DLQMessage.findPendingMessages(this.batchSize);

            if (messages.length === 0) {
                logger.debug('No pending messages found');
                return;
            }

            logger.info('Found pending DLQ messages', {
                count: messages.length
            });

            // Process the batch
            const results = await processBatch(messages, this.messageQueue, this.workerId);

            // Update statistics
            this.stats.totalProcessed += results.total;
            this.stats.totalSuccessful += results.successful;
            this.stats.totalFailed += results.failed;

            logger.info('Batch processing completed', {
                processed: results.total,
                successful: results.successful,
                failed: results.failed,
                totalProcessed: this.stats.totalProcessed
            });

        } catch (error) {
            logger.error('Failed to process pending messages', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Stop the worker gracefully
     */
    async stop() {
        logger.info('Stopping worker orchestrator', {
            workerId: this.workerId
        });

        this.isRunning = false;

        // Close queue connection
        if (this.messageQueue) {
            try {
                await this.messageQueue.close();
                logger.info('Message queue closed');
            } catch (error) {
                logger.error('Error closing message queue', {
                    error: error.message
                });
            }
        }

        // Log final statistics
        this.logStatistics();

        logger.info('Worker orchestrator stopped');
    }

    /**
     * Log worker statistics
     */
    logStatistics() {
        const uptime = this.stats.startTime
            ? Date.now() - this.stats.startTime.getTime()
            : 0;

        logger.info('Worker Statistics', {
            workerId: this.workerId,
            totalProcessed: this.stats.totalProcessed,
            totalSuccessful: this.stats.totalSuccessful,
            totalFailed: this.stats.totalFailed,
            successRate: this.stats.totalProcessed > 0
                ? `${((this.stats.totalSuccessful / this.stats.totalProcessed) * 100).toFixed(2)}%`
                : 'N/A',
            uptimeMs: uptime,
            startTime: this.stats.startTime
        });
    }

    /**
     * Get current worker statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            workerId: this.workerId,
            isRunning: this.isRunning,
            uptime: this.stats.startTime
                ? Date.now() - this.stats.startTime.getTime()
                : 0
        };
    }
}

module.exports = WorkerOrchestrator;
