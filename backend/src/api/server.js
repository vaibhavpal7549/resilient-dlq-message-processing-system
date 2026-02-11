require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongodb = require('../db/mongodb');
const redisClient = require('../db/redis');
const queueManager = require('../queue/queueManager');
const primaryProcessor = require('../processor/primaryProcessor');
const circuitBreaker = require('../circuit-breaker/circuitBreaker');
const logger = require('../utils/logger');
const config = require('../utils/config');

// Import routes
const messagesRoute = require('./routes/messages');
const healthRoute = require('./routes/health');
const dlqRoute = require('./routes/dlq');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  }
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.use('/api/messages', messagesRoute);
app.use('/api/dlq', dlqRoute);
app.use('/api/system', healthRoute);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'DLQ Message Processing System',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      messages: 'POST /api/messages',
      health: 'GET /api/system/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(config.server.env === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

// Initialize and start server
async function start() {
  try {
    logger.info('Starting DLQ Backend Server...');

    // Connect to MongoDB
    await mongodb.connect();

    // Connect to Redis
    await redisClient.connect();

    // Initialize queue
    await queueManager.initialize();

    // Initialize processor
    await primaryProcessor.initialize();

    // Start circuit breaker monitoring
    circuitBreaker.startMonitoring();

    // Start Express server
    const PORT = config.server.port;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        env: config.server.env,
        port: PORT
      });
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        try {
          // Stop circuit breaker monitoring
          circuitBreaker.stopMonitoring();

          // Close queue
          await queueManager.close();

          // Disconnect from databases
          await mongodb.disconnect();
          await redisClient.disconnect();

          logger.info('Server shut down successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
if (require.main === module) {
  start();
}

module.exports = app;
