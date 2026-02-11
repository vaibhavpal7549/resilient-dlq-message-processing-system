const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('../../utils/uuid');
const queueManager = require('../../queue/queueManager');
const circuitBreakerMiddleware = require('../middleware/circuitBreaker');
const { validateMessage } = require('../middleware/validation');
const logger = require('../../utils/logger').createComponentLogger('messages-route');

/**
 * POST /api/messages
 * Submit a new message for processing
 */
router.post('/', 
  circuitBreakerMiddleware,
  validateMessage,
  async (req, res) => {
    try {
      const message = req.validatedMessage;
      
      // Generate unique message ID
      const messageId = `msg_${Date.now()}_${uuidv4().substring(0, 8)}`;
      
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

      // Enqueue message
      await queueManager.enqueue(queueMessage);

      logger.info('Message accepted', { messageId });

      res.status(202).json({
        success: true,
        message: 'Message accepted for processing',
        messageId,
        status: 'queued'
      });

    } catch (error) {
      logger.error('Failed to accept message:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to accept message',
        details: error.message
      });
    }
  }
);

module.exports = router;
