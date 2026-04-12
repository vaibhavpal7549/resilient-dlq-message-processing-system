const express = require('express');
const router = express.Router();
const DLQMessage = require('../../db/models/DLQMessage');
const queueManager = require('../../queue/queueManager');
const unixSpool = require('../../dlq/unixSpool');
const logger = require('../../utils/logger').createComponentLogger('dlq-route');
const config = require('../../utils/config');

function buildQuery(input = {}, includeDefaultPending = false) {
  const query = {};

  if (includeDefaultPending) {
    query.status = 'dlq_pending';
  }

  if (input.status) query.status = input.status;
  if (input.errorType) query.errorType = input.errorType;
  if (input.source) query['metadata.source'] = input.source;

  if (input.startDate || input.endDate) {
    query.createdAt = {};
    if (input.startDate) query.createdAt.$gte = new Date(input.startDate);
    if (input.endDate) query.createdAt.$lte = new Date(input.endDate);
  }

  return query;
}

function createReplayMessage(dlqMessage, replayTag) {
  return {
    messageId: `replay_${dlqMessage.messageId}_${Date.now()}`,
    payload: dlqMessage.originalMessage,
    source: dlqMessage.metadata?.source || 'dlq',
    priority: dlqMessage.metadata?.priority || 2,
    tags: [...(dlqMessage.metadata?.tags || []), replayTag],
    retryCount: 0,
    originalDLQId: dlqMessage._id
  };
}

async function markAsReplayed(dlqMessage, workerId, strategy, notes) {
  dlqMessage.status = 'dlq_replayed';
  await dlqMessage.addReplayAttempt({
    timestamp: new Date(),
    workerId,
    strategy,
    result: 'replayed',
    notes
  });
  return dlqMessage.save();
}

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = buildQuery(req.query, false);
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [messages, total] = await Promise.all([
      DLQMessage.find(query).sort(sort).skip(skip).limit(parseInt(limit, 10)).lean(),
      DLQMessage.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10))
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

router.get('/stats', async (req, res) => {
  try {
    const [total, byStatus, byErrorType, spoolStats] = await Promise.all([
      DLQMessage.countDocuments(),
      DLQMessage.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      DLQMessage.aggregate([
        { $group: { _id: '$errorType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      unixSpool.getStats()
    ]);

    res.json({
      success: true,
      stats: {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topErrors: byErrorType,
        unixSpool: spoolStats
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

router.get('/spool', async (req, res) => {
  try {
    const entries = await unixSpool.list();
    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    logger.error('Failed to list unix spool entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list unix spool entries',
      details: error.message
    });
  }
});

router.post('/spool/replay', async (req, res) => {
  try {
    const files = await unixSpool.list();
    const limit = Math.min(parseInt(req.body?.batchSize || config.spool.replayBatchSize, 10), config.spool.replayBatchSize);
    const selected = files.slice(0, limit);

    const results = {
      total: selected.length,
      replayedToMongo: 0,
      failed: 0
    };

    for (const entry of selected) {
      try {
        const payload = await unixSpool.read(entry.fileName);
        await DLQMessage.findOneAndUpdate(
          { messageId: payload.messageId },
          {
            $set: payload,
            $setOnInsert: {
              replayAttempts: []
            }
          },
          { upsert: true, new: true, runValidators: true }
        );
        await unixSpool.remove(entry.fileName);
        results.replayedToMongo++;
      } catch (error) {
        logger.error('Failed to replay unix spool entry to MongoDB', {
          fileName: entry.fileName,
          error: error.message
        });
        results.failed++;
      }
    }

    res.json({
      success: true,
      message: 'Unix spool replay completed',
      results
    });
  } catch (error) {
    logger.error('Failed to replay unix spool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to replay unix spool',
      details: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const message = await DLQMessage.findById(req.params.id);

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

router.post('/:id/resolve', async (req, res) => {
  try {
    const { resolvedBy = 'api', notes = 'Resolved via API' } = req.body || {};
    const dlqMessage = await DLQMessage.findById(req.params.id);

    if (!dlqMessage) {
      return res.status(404).json({
        success: false,
        error: 'DLQ message not found'
      });
    }

    await dlqMessage.markAsResolved(resolvedBy, notes);

    res.json({
      success: true,
      message: 'Message resolved successfully',
      data: dlqMessage
    });
  } catch (error) {
    logger.error('Failed to resolve DLQ message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve message',
      details: error.message
    });
  }
});

router.post('/:id/replay', async (req, res) => {
  try {
    const dlqMessage = await DLQMessage.findById(req.params.id);

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

    const replayMessage = createReplayMessage(dlqMessage, 'manual_replay');
    await queueManager.enqueue(replayMessage);
    await markAsReplayed(dlqMessage, 'api', 'manual_replay', 'Replayed via API');

    res.json({
      success: true,
      message: 'Message replayed successfully',
      replayMessageId: replayMessage.messageId,
      data: dlqMessage
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

router.post('/replay-batch', async (req, res) => {
  try {
    const {
      messageIds = [],
      filters = {},
      batchSize = config.dlq.replayBatchLimit,
      dryRun = false
    } = req.body;

    const limit = Math.min(parseInt(batchSize, 10), config.dlq.replayBatchLimit);
    const query = Array.isArray(messageIds) && messageIds.length > 0
      ? { _id: { $in: messageIds } }
      : buildQuery(filters, true);

    const messages = await DLQMessage.find(query).limit(limit);

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        message: `Would replay ${messages.length} messages`,
        preview: messages.slice(0, 5).map((message) => ({
          id: message._id,
          messageId: message.messageId,
          errorType: message.errorType,
          status: message.status
        }))
      });
    }

    const results = {
      total: messages.length,
      success: 0,
      failed: 0
    };

    for (const dlqMessage of messages) {
      try {
        const replayMessage = createReplayMessage(dlqMessage, 'batch_replay');
        await queueManager.enqueue(replayMessage);
        await markAsReplayed(dlqMessage, 'api', 'batch_replay', 'Batch replay via API');
        results.success++;
      } catch (error) {
        logger.error('Failed to replay message in batch', {
          messageId: dlqMessage.messageId,
          error: error.message
        });
        results.failed++;
      }
    }

    res.json({
      success: true,
      message: 'Batch replay completed',
      results
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
