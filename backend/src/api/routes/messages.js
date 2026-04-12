const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('../../utils/uuid');
const queueManager = require('../../queue/queueManager');
const { validateMessage } = require('../middleware/validation');
const { attachRetryPolicy } = require('../middleware/retryPolicy');
const { Message } = require('../../db/models/Message');
const circuitBreakerMiddleware = require('../middleware/circuitBreaker');
const logger = require('../../utils/logger').createComponentLogger('messages-route');

/**
 * GET /api/messages/stats
 * Message lifecycle stats for dashboard cards
 */
router.get('/stats', async (req, res) => {
  try {
    const [total, byStatus] = await Promise.all([
      Message.countDocuments(),
      Message.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const counts = byStatus.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    res.json({
      success: true,
      stats: {
        total,
        byStatus: counts,
        dlq: counts.DLQ || 0,
        failed: counts.FAILED || 0,
        processing: counts.PROCESSING || 0,
        replayed: counts.REPLAYED || 0,
        resolved: counts.RESOLVED || 0
      }
    });
  } catch (error) {
    logger.error('Failed to fetch message stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message stats',
      details: error.message
    });
  }
});

/**
 * POST /api/messages
 * Submit a new message for processing
 */
router.post('/', 
  circuitBreakerMiddleware,
  attachRetryPolicy,
  validateMessage,
  async (req, res) => {
    let messageId = null;
    try {
      const message = req.validatedMessage;
      const retryPolicy = req.retryPolicy;
      
      // Generate unique message ID
      messageId = `msg_${Date.now()}_${uuidv4().substring(0, 8)}`;
      
      // Prepare message for queue
      const queueMessage = {
        messageId,
        payload: message.payload,
        source: message.source || 'api',
        priority: message.priority || 2,
        tags: message.tags || [],
        headers: req.headers,
        retryCount: 0,
        createdAt: new Date()
      };

      await Message.create({
        messageId,
        payload: queueMessage.payload,
        retryCount: 0,
        status: 'PROCESSING',
        failureReason: null
      });

      // Enqueue message
      await queueManager.enqueue(queueMessage);

      logger.info('Message accepted for processing', {
        messageId,
        source: queueMessage.source,
        retryLimit: retryPolicy.maxRetries,
        simulateError: Boolean(queueMessage.payload?.simulateError)
      });

      res.status(202).json({
        success: true,
        message: 'Message accepted for processing',
        messageId,
        status: 'PROCESSING',
        retryCount: 0,
        retryLimit: retryPolicy.maxRetries
      });

    } catch (error) {
      logger.error('Failed to accept message:', error);

      if (messageId) {
        await Message.findOneAndUpdate(
          { messageId },
          {
            $set: {
              status: 'FAILED',
              failureReason: `Ingestion failed: ${error.message}`
            }
          }
        ).catch(() => null);
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to accept message',
        details: error.message
      });
    }
  }
);

module.exports = router;
