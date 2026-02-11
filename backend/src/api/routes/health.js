const express = require('express');
const router = express.Router();
const mongodb = require('../../db/mongodb');
const redisClient = require('../../db/redis');
const queueManager = require('../../queue/queueManager');
const circuitBreaker = require('../../circuit-breaker/circuitBreaker');
const primaryProcessor = require('../../processor/primaryProcessor');
const dlqRouter = require('../../dlq/dlqRouter');

/**
 * GET /api/system/health
 * Get system health and status
 */
router.get('/health', async (req, res) => {
  try {
    // Check component health
    const mongoHealthy = mongodb.isHealthy();
    const redisHealthy = await redisClient.isHealthy();
    
    // Get metrics
    const queueMetrics = await queueManager.getQueueMetrics();
    const circuitBreakerMetrics = circuitBreaker.getMetrics();
    const processorMetrics = primaryProcessor.getMetrics();
    const dlqStats = await dlqRouter.getStats();

    const isHealthy = mongoHealthy && redisHealthy;

    res.status(isHealthy ? 200 : 503).json({
      success: true,
      healthy: isHealthy,
      timestamp: new Date(),
      components: {
        mongodb: {
          healthy: mongoHealthy,
          status: mongoHealthy ? 'connected' : 'disconnected'
        },
        redis: {
          healthy: redisHealthy,
          status: redisHealthy ? 'connected' : 'disconnected'
        },
        queue: {
          healthy: queueMetrics !== null,
          metrics: queueMetrics
        },
        circuitBreaker: {
          state: circuitBreakerMetrics.state,
          failureRate: circuitBreakerMetrics.failureRate,
          metrics: circuitBreakerMetrics
        },
        processor: {
          healthy: processorMetrics.isProcessing,
          metrics: processorMetrics
        },
        dlq: {
          healthy: dlqStats !== null,
          stats: dlqStats
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

module.exports = router;
