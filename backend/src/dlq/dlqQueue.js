const DLQMessage = require('../db/models/DLQMessage');
const logger = require('../utils/logger').createComponentLogger('dlq-queue');

class DLQQueue {
  constructor() {
    this.queue = [];
    this.enqueuedIds = new Set();
  }

  async enqueueDLQ(payload) {
    const persisted = await DLQMessage.findOneAndUpdate(
      { messageId: payload.messageId },
      {
        $set: payload,
        $setOnInsert: {
          replayAttempts: []
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    if (!this.enqueuedIds.has(persisted.messageId)) {
      this.queue.push(persisted.messageId);
      this.enqueuedIds.add(persisted.messageId);
    }

    logger.info('Message enqueued into simulated DLQ FIFO', {
      messageId: persisted.messageId,
      queueDepth: this.queue.length
    });

    return persisted;
  }

  async dequeueDLQ() {
    if (this.queue.length === 0) {
      const fallback = await DLQMessage.findOne({
        status: 'dlq_pending'
      })
        .sort({ createdAt: 1 })
        .lean();

      if (!fallback) {
        return null;
      }

      logger.debug('DLQ FIFO empty, using MongoDB fallback', {
        messageId: fallback.messageId
      });

      return fallback;
    }

    const messageId = this.queue.shift();
    this.enqueuedIds.delete(messageId);

    const message = await DLQMessage.findOne({ messageId }).lean();

    if (!message) {
      logger.warn('Dequeued DLQ message no longer exists in MongoDB', { messageId });
      return null;
    }

    logger.info('Message dequeued from simulated DLQ FIFO', {
      messageId,
      queueDepth: this.queue.length
    });

    return message;
  }

  getDepth() {
    return this.queue.length;
  }
}

const dlqQueue = new DLQQueue();

module.exports = dlqQueue;
module.exports.enqueueDLQ = dlqQueue.enqueueDLQ.bind(dlqQueue);
module.exports.dequeueDLQ = dlqQueue.dequeueDLQ.bind(dlqQueue);
