/**
 * DLQ Worker Service - Main Entry Point
 * 
 * Initializes and starts the DLQ worker service.
 * Handles graceful shutdown on SIGTERM/SIGINT signals.
 */

const dbConnection = require('./db/connection');
const WorkerOrchestrator = require('./services/workerOrchestrator');
const { logStartup, logShutdown, logger } = require('./utils/logger');

// Global worker instance
let worker = null;

/**
 * Start the DLQ worker service
 */
async function start() {
    try {
        // Create worker instance
        worker = new WorkerOrchestrator();

        // Log startup information
        logStartup(worker.workerId);

        // Connect to MongoDB
        logger.info('Connecting to MongoDB...');
        await dbConnection.connect();

        // Initialize worker
        logger.info('Initializing worker...');
        await worker.initialize();

        // Start worker polling loop
        logger.info('Starting worker...');
        await worker.start();

    } catch (error) {
        logger.error('Failed to start DLQ worker', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

/**
 * Gracefully shutdown the worker
 */
async function shutdown(signal) {
    try {
        logShutdown(signal);

        // Stop worker
        if (worker) {
            await worker.stop();
        }

        // Disconnect from MongoDB
        await dbConnection.disconnect();

        logger.info('Shutdown complete');
        process.exit(0);

    } catch (error) {
        logger.error('Error during shutdown', {
            error: error.message
        });
        process.exit(1);
    }
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers() {
    process.on('SIGTERM', () => {
        logger.info('SIGTERM signal received');
        shutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
        logger.info('SIGINT signal received');
        shutdown('SIGINT');
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', {
            error: error.message,
            stack: error.stack
        });
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled rejection', {
            reason,
            promise
        });
        shutdown('unhandledRejection');
    });
}

/**
 * Main execution
 */
if (require.main === module) {
    setupSignalHandlers();
    start();
}

module.exports = {
    start,
    shutdown
};
