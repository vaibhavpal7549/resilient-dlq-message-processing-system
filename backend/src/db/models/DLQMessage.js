const mongoose = require('mongoose');

const dlqMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalMessage: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  errorReason: {
    type: String,
    required: true
  },
  errorStack: {
    type: String
  },
  errorType: {
    type: String,
    required: true,
    index: true
  },
  retryCount: {
    type: Number,
    required: true,
    default: 0
  },
  dlqRetryCount: {
    type: Number,
    default: 0
  },
  firstFailedAt: {
    type: Date,
    required: true
  },
  lastFailedAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['dlq_pending', 'dlq_processing', 'dlq_resolved', 'dlq_failed', 'dlq_manual', 'dlq_archived', 'dlq_replayed'],
    default: 'dlq_pending',
    index: true
  },
  lockedBy: {
    type: String,
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  nextRetryAt: {
    type: Date,
    default: null,
    index: true
  },
  metadata: {
    source: String,
    priority: {
      type: Number,
      default: 2
    },
    tags: [String],
    requestHeaders: mongoose.Schema.Types.Mixed,
    systemState: {
      cpuUsage: Number,
      memoryUsage: Number,
      activeConnections: Number,
      queueDepth: Number
    }
  },
  replayAttempts: [{
    timestamp: Date,
    workerId: String,
    strategy: String,
    result: String,
    errorReason: String,
    notes: String
  }],
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: String,
    default: null
  },
  resolutionNotes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
dlqMessageSchema.index({ status: 1, createdAt: -1 });
dlqMessageSchema.index({ 'metadata.source': 1, status: 1 });
dlqMessageSchema.index({ status: 1, nextRetryAt: 1 });
dlqMessageSchema.index({ errorType: 1, createdAt: -1 });

// Instance methods
dlqMessageSchema.methods.addReplayAttempt = function(attempt) {
  this.replayAttempts.push(attempt);
  return this.save();
};

dlqMessageSchema.methods.markAsResolved = function(resolvedBy, notes) {
  this.status = 'dlq_resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = notes;
  return this.save();
};

dlqMessageSchema.methods.markAsFailed = function() {
  this.status = 'dlq_failed';
  return this.save();
};

dlqMessageSchema.methods.acquireLock = function(workerId) {
  this.lockedBy = workerId;
  this.lockedAt = new Date();
  this.status = 'dlq_processing';
  return this.save();
};

dlqMessageSchema.methods.releaseLock = function() {
  this.lockedBy = null;
  this.lockedAt = null;
  this.status = 'dlq_pending';
  return this.save();
};

// Static methods
dlqMessageSchema.statics.findPendingMessages = function(limit = 10) {
  return this.find({
    status: 'dlq_pending',
    nextRetryAt: { $lte: new Date() },
    lockedBy: null
  })
  .sort({ 'metadata.priority': 1, createdAt: 1 })
  .limit(limit);
};

dlqMessageSchema.statics.clearStaleLocks = async function(timeoutMs = 300000) {
  const cutoff = new Date(Date.now() - timeoutMs);
  const result = await this.updateMany(
    {
      lockedBy: { $ne: null },
      lockedAt: { $lt: cutoff }
    },
    {
      $set: {
        lockedBy: null,
        lockedAt: null,
        status: 'dlq_pending'
      }
    }
  );
  return result.modifiedCount;
};

const DLQMessage = mongoose.model('DLQMessage', dlqMessageSchema);

module.exports = DLQMessage;
