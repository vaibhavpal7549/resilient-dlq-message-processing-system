/**
 * Winston Logger Configuration
 * 
 * Provides structured logging with multiple transports (console, file).
 * Supports component-specific loggers with contextual metadata.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format with timestamp and metadata
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

/**
 * Console format for development (human-readable)
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, component, ...meta }) => {
        const componentStr = component ? `[${component}]` : '';
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} ${level} ${componentStr}: ${message}${metaStr}`;
    })
);

/**
 * Create transports based on configuration
 */
const transports = [];

// Console transport
if (config.logging.console) {
    transports.push(
        new winston.transports.Console({
            format: config.logging.json ? logFormat : consoleFormat,
            level: config.logging.level
        })
    );
}

// File transport
transports.push(
    new winston.transports.File({
        filename: config.logging.file,
        format: logFormat,
        level: config.logging.level,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true
    })
);

// Error-specific file transport
transports.push(
    new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        format: logFormat,
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true
    })
);

/**
 * Base logger instance
 */
const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports,
    exitOnError: false
});

/**
 * Create a component-specific logger
 * @param {string} component - Component name (e.g., 'worker', 'processor', 'db')
 * @returns {winston.Logger} Logger instance with component context
 */
function createComponentLogger(component) {
    return logger.child({ component });
}

/**
 * Log application startup information
 */
function logStartup(workerId) {
    logger.info('='.repeat(60));
    logger.info('DLQ Worker Service Starting', {
        workerId,
        nodeEnv: config.app.env,
        mongoUri: config.mongodb.uri.replace(/\/\/.*@/, '//***@'), // Hide credentials
        redisHost: config.redis.host,
        pollInterval: config.dlq.pollIntervalMs,
        batchSize: config.dlq.batchSize,
        maxRetries: config.dlq.maxRetries
    });
    logger.info('='.repeat(60));
}

/**
 * Log graceful shutdown
 */
function logShutdown(reason) {
    logger.info('='.repeat(60));
    logger.info('DLQ Worker Service Shutting Down', { reason });
    logger.info('='.repeat(60));
}

module.exports = {
    logger,
    createComponentLogger,
    logStartup,
    logShutdown
};
