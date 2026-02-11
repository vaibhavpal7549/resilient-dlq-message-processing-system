const express = require('express');
const router = express.Router();
const DLQMessage = require('../../db/models/DLQMessage');
const queueManager = require('../../queue/queueManager');
const logger = require('../../utils/logger').createComponentLogger('dlq-route');

/**
 * GET /api/dlq
 * List all DLQ messages with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      errorType,
      source,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (errorType) query.errorType = errorType;
    if (source) query['metadata.source'] = source;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const [messages, total] = await Promise.all([
      DLQMessage.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DLQMessage.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Failed to list DLQ messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list DLQ messages',
      details: error.message
    });
  }
});

/**
 * GET /api/dlq/stats
 * Get DLQ statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [total, byStatus, byErrorType] = await Promise.all([
      DLQMessage.countDocuments(),
      DLQMessage.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      DLQMessage.aggregate([
        { $group: { _id: '$errorType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topErrors: byErrorType
      }
    });

  } catch (error) {
    logger.error('Failed to get DLQ stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get DLQ stats',
      details: error.message
    });
  }
});

/**
 * GET /api/dlq/:id
 * Get single DLQ message by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const message = await DLQMessage.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'DLQ message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    logger.error('Failed to get DLQ message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get DLQ message',
      details: error.message
    });
  }
});

/**
 * POST /api/dlq/:id/replay
 * Replay a single DLQ message
 */
router.post('/:id/replay', async (req, res) => {
  try {
    const { id } = req.params;

    const dlqMessage = await DLQMessage.findById(id);

    if (!dlqMessage) {
      return res.status(404).json({
        success: false,
        error: 'DLQ message not found'
      });
    }

    if (dlqMessage.status === 'dlq_processing') {
      return res.status(409).json({
        success: false,
        error: 'Message is currently being processed'
      });
    }

    // Re-enqueue to primary queue
    const replayMessage = {
      messageId: `replay_${dlqMessage.messageId}_${Date.now()}`,
      payload: dlqMessage.originalMessage,
      source: dlqMessage.metadata.source,
      priority: dlqMessage.metadata.priority,
      tags: [...(dlqMessage.metadata.tags || []), 'replayed'],
      retryCount: 0,
      originalDLQId: dlqMessage._id
    };

    await queueManager.enqueue(replayMessage);

    // Update DLQ message
    dlqMessage.status = 'dlq_replayed';
    await dlqMessage.addReplayAttempt({
      timestamp: new Date(),
      workerId: 'api',
      strategy: 'manual_replay',
      result: 'replayed',
      notes: 'Replayed via API'
    });

    logger.info('DLQ message replayed', {
      dlqId: id,
      messageId: dlqMessage.messageId,
      replayMessageId: replayMessage.messageId
    });

    res.json({
      success: true,
      message: 'Message replayed successfully',
      replayMessageId: replayMessage.messageId
    });

  } catch (error) {
    logger.error('Failed to replay DLQ message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to replay message',
      details: error.message
    });
  }
});

/**
 * POST /api/dlq/replay-batch
 * Replay multiple DLQ messages
 */
router.post('/replay-batch', async (req, res) => {
  try {
    const {
      filters = {},
      batchSize = 100,
      dryRun = false
    } = req.body;

    // Build query from filters
    const query = { status: 'dlq_pending' };
    if (filters.errorType) query.errorType = filters.errorType;
    if (filters.source) query['metadata.source'] = filters.source;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    // Find messages to replay
    const messages = await DLQMessage.find(query)
      .limit(batchSize)
      .lean();

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        message: `Would replay ${messages.length} messages`,
        preview: messages.slice(0, 5).map(m => ({
          id: m._id,
          messageId: m.messageId,
          errorType: m.errorType
        }))
      });
    }

    // Replay messages
    let successCount = 0;
    let failureCount = 0;

    for (const dlqMsg of messages) {
      try {
        const replayMessage = {
          messageId: `replay_${dlqMsg.messageId}_${Date.now()}`,
          payload: dlqMsg.originalMessage,
          source: dlqMsg.metadata.source,
          priority: dlqMsg.metadata.priority,
          tags: [...(dlqMsg.metadata.tags || []), 'batch_replayed'],
          retryCount: 0,
          originalDLQId: dlqMsg._id
        };

        await queueManager.enqueue(replayMessage);

        // Update status
        await DLQMessage.findByIdAndUpdate(dlqMsg._id, {
          status: 'dlq_replayed',
          $push: {
            replayAttempts: {
              timestamp: new Date(),
              workerId: 'api',
              strategy: 'batch_replay',
              result: 'replayed',
              notes: 'Batch replay via API'
            }
          }
        });

        successCount++;
      } catch (error) {
        logger.error('Failed to replay message in batch:', error);
        failureCount++;
      }
    }

    logger.info('Batch replay completed', {
      total: messages.length,
      success: successCount,
      failed: failureCount
    });

    res.json({
      success: true,
      message: 'Batch replay completed',
      results: {
        total: messages.length,
        success: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    logger.error('Failed to replay batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to replay batch',
      details: error.message
    });
  }
});

module.exports = router;
