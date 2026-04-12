const mongoose = require('mongoose');

const MESSAGE_STATUSES = [
  'PROCESSING',
  'FAILED',
  'DLQ',
  'REPLAYED',
  'RESOLVED'
];

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 128
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator(value) {
          return value !== null && value !== undefined;
        },
        message: 'payload is required'
      }
    },
    retryCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      required: true,
      enum: MESSAGE_STATUSES,
      default: 'PROCESSING'
    },
    failureReason: {
      type: String,
      default: null,
      maxlength: 500
    }
  },
  {
    timestamps: true,
    collection: 'messages'
  }
);

messageSchema.index({ messageId: 1 }, { unique: true, name: 'uq_message_id' });
messageSchema.index({ status: 1, updatedAt: -1 }, { name: 'idx_status_updated_at' });
messageSchema.index({ status: 1, retryCount: -1, createdAt: -1 }, { name: 'idx_status_retry_created' });
messageSchema.index(
  { status: 1, failureReason: 1, updatedAt: -1 },
  {
    name: 'idx_dlq_failure_reason',
    partialFilterExpression: { status: 'DLQ' }
  }
);

messageSchema.path('failureReason').validate(function validateFailureReason(value) {
  if ((this.status === 'FAILED' || this.status === 'DLQ') && !value) {
    return false;
  }
  return true;
}, 'failureReason is required when status is FAILED or DLQ');

messageSchema.methods.markFailed = function markFailed(reason) {
  this.status = 'FAILED';
  this.failureReason = reason;
  return this.save();
};

messageSchema.methods.moveToDLQ = function moveToDLQ(reason) {
  this.status = 'DLQ';
  this.failureReason = reason;
  return this.save();
};

messageSchema.methods.markReplayed = function markReplayed() {
  this.status = 'REPLAYED';
  return this.save();
};

messageSchema.methods.markResolved = function markResolved() {
  this.status = 'RESOLVED';
  return this.save();
};

module.exports = {
  Message: mongoose.model('Message', messageSchema),
  MESSAGE_STATUSES
};
