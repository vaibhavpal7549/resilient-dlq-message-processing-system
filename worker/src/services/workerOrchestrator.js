/**
 * Worker Orchestrator Service
 * 
 * Main orchestration service for the DLQ worker.
 * Manages polling loop, batch retrieval, stale lock cleanup, and graceful shutdown.
 */

const amqp = require('amqplib');
const config = require('../config');
const { createComponentLogger } = require('../utils/logger');
const { sleep, generateWorkerId } = require('../utils/helpers');
const DLQMessage = require('../db/models/DLQMessage');
const { processBatch } = require('./messageProcessor');

const logger = createComponentLogger('worker-orchestrator');

function toErrorMeta(error) {
    if (!error) {
        return { error: 'Unknown queue error' };
    }

    if (error instanceof Error) {
        return {
            error: error.message || error.name,
            name: error.name,
            code: error.code,
            stack: error.stack
        };
    }

    if (typeof error === 'string') {
        return { error };
    }

    return { error: JSON.stringify(error) };
}

/**
 * Worker Orchestrator Class
 */
class WorkerOrchestrator {
    constructor() {
        this.workerId = generateWorkerId();
        this.isRunning = false;
        this.isStopping = false;
        this.messageQueue = null;
        this._connection = null;
        this._channel = null;
        this.pollInterval = config.dlq.pollIntervalMs;
        this.batchSize = config.dlq.batchSize;
        this.lockTimeout = config.dlq.lockTimeoutMs;
        this.stats = {
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0,
            loopIterations: 0,
            lastPollAt: null,
            startTime: null
        };
    }

    /**
     * Initialize the worker
     * Sets up RabbitMQ connection and queue
     */
    async initialize() {
        try {
            logger.info('Initializing worker orchestrator', {
                workerId: this.workerId,
                pollInterval: this.pollInterval,
                batchSize: this.batchSize
            });

            // Connect to RabbitMQ
            const url = config.rabbitmq.url;
            logger.info('Connecting to RabbitMQ...', {
                url: url.replace(/\/\/.*@/, '//***@')
            });

            this._connection = await amqp.connect(url);
            this._channel = await this._connection.createChannel();

            // Assert the queue exists
            await this._channel.assertQueue(config.queue.name, {
                durable: true,
                arguments: {
                    'x-message-ttl': 86400000
                }
            });

            // Create a queue-like wrapper for compatibility with messageProcessor/retryStrategy
            this.messageQueue = {
                add: async (message, options = {}) => {
                    const messageBuffer = Buffer.from(JSON.stringify(message));
                    const publishOptions = {
                        persistent: true,
                        contentType: 'application/json',
                        messageId: message.messageId
                    };

                    if (options.delay && options.delay > 0) {
                        const delayQueue = `${config.queue.name}.delay.${options.delay}`;
                        await this._channel.assertQueue(delayQueue, {
                            durable: true,
                            arguments: {
                                'x-dead-letter-exchange': '',
                                'x-dead-letter-routing-key': config.queue.name,
                                'x-message-ttl': options.delay,
                                'x-expires': options.delay + 60000
                            }
                        });
                        this._channel.sendToQueue(delayQueue, messageBuffer, publishOptions);
                    } else {
                        this._channel.sendToQueue(config.queue.name, messageBuffer, publishOptions);
                    }

                    return { id: message.messageId };
                },
                close: async () => {
                    // Handled in stop()
                }
            };

            // Setup connection event handlers
            this._connection.on('error', (error) => {
                logger.error('RabbitMQ connection error', toErrorMeta(error));
            });

            this._connection.on('close', () => {
                logger.warn('RabbitMQ connection closed');
            });

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
                this.stats.loopIterations += 1;
                this.stats.lastPollAt = new Date();

                logger.debug('Worker poll tick', {
                    workerId: this.workerId,
                    loopIterations: this.stats.loopIterations,
                    pollInterval: this.pollInterval
                });

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
                count: messages.length,
                workerId: this.workerId
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
                failureDetails: results.details.filter((detail) => !detail.success).slice(0, 3),
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
        if (this.isStopping) {
            return;
        }

        this.isStopping = true;
        logger.info('Stopping worker orchestrator', {
            workerId: this.workerId
        });

        this.isRunning = false;

        // Close RabbitMQ channel and connection
        try {
            if (this._channel) {
                await this._channel.close();
                this._channel = null;
                logger.info('RabbitMQ channel closed');
            }
        } catch (error) {
            logger.error('Error closing RabbitMQ channel', {
                error: error.message
            });
        }

        try {
            if (this._connection) {
                await this._connection.close();
                this._connection = null;
                logger.info('RabbitMQ connection closed');
            }
        } catch (error) {
            logger.error('Error closing RabbitMQ connection', {
                error: error.message
            });
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
            loopIterations: this.stats.loopIterations,
            lastPollAt: this.stats.lastPollAt,
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
