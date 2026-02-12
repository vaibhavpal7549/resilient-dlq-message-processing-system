/**
 * MongoDB Connection Management
 * 
 * Handles MongoDB connection lifecycle with proper error handling,
 * connection pooling, and graceful shutdown.
 */

const mongoose = require('mongoose');
const config = require('../config');
const { createComponentLogger } = require('../utils/logger');

const logger = createComponentLogger('mongodb');

/**
 * MongoDB connection state
 */
let isConnected = false;

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise<void>}
 */
async function connect() {
    if (isConnected) {
        logger.info('MongoDB already connected');
        return;
    }

    try {
        logger.info('Connecting to MongoDB...', {
            uri: config.mongodb.uri.replace(/\/\/.*@/, '//***@'), // Hide credentials
            poolSize: config.mongodb.poolSize
        });

        await mongoose.connect(config.mongodb.uri, config.mongodb.options);

        isConnected = true;

        logger.info('MongoDB connected successfully', {
            host: mongoose.connection.host,
            database: mongoose.connection.name
        });

        // Setup connection event handlers
        setupEventHandlers();

    } catch (error) {
        logger.error('Failed to connect to MongoDB', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Disconnect from MongoDB gracefully
 * @returns {Promise<void>}
 */
async function disconnect() {
    if (!isConnected) {
        logger.info('MongoDB already disconnected');
        return;
    }

    try {
        logger.info('Disconnecting from MongoDB...');
        await mongoose.connection.close();
        isConnected = false;
        logger.info('MongoDB disconnected successfully');
    } catch (error) {
        logger.error('Error disconnecting from MongoDB', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Setup MongoDB connection event handlers
 */
function setupEventHandlers() {
    mongoose.connection.on('connected', () => {
        logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error', {
            error: error.message
        });
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        isConnected = true;
    });

    // Handle process termination
    process.on('SIGINT', async () => {
        await disconnect();
    });
}

/**
 * Check if MongoDB is connected
 * @returns {boolean}
 */
function isMongoConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Get MongoDB connection statistics
 * @returns {Object} Connection statistics
 */
function getConnectionStats() {
    return {
        isConnected: isMongoConnected(),
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        collections: Object.keys(mongoose.connection.collections)
    };
}

module.exports = {
    connect,
    disconnect,
    isConnected: isMongoConnected,
    getConnectionStats
};
