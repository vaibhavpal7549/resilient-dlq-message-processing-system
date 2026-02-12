/**
 * DLQ Message Model
 * 
 * MongoDB schema and model for Dead Letter Queue messages.
 * Includes methods for lock management, status updates, and querying.
 */

const mongoose = require('mongoose');

/**
 * DLQ Message Schema
 */
const dlqMessageSchema = new mongoose.Schema({
    // Unique message identifier
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Original message payload
    originalMessage: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    // Error information
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

    // Retry tracking
    retryCount: {
        type: Number,
        required: true,
        default: 0
    },

    dlqRetryCount: {
        type: Number,
        default: 0
    },

    // Timestamps
    firstFailedAt: {
        type: Date,
        required: true
    },

    lastFailedAt: {
        type: Date,
        required: true
    },

    // Processing status
    status: {
        type: String,
        required: true,
        enum: [
            'dlq_pending',      // Ready for processing
            'dlq_processing',   // Currently being processed
            'dlq_resolved',     // Successfully resolved
            'dlq_failed',       // Permanently failed
            'dlq_manual',       // Requires manual intervention
            'dlq_archived',     // Archived for historical purposes
            'dlq_replayed'      // Successfully replayed
        ],
        default: 'dlq_pending',
        index: true
    },

    // Lock management for distributed processing
    lockedBy: {
        type: String,
        default: null
    },

    lockedAt: {
        type: Date,
        default: null
    },

    // Next retry scheduling
    nextRetryAt: {
        type: Date,
        default: null,
        index: true
    },

    // Metadata
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

    // Replay attempt history
    replayAttempts: [{
        timestamp: Date,
        workerId: String,
        strategy: String,
        result: String,
        errorReason: String,
        notes: String
    }],

    // Resolution tracking
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
    timestamps: true // Adds createdAt and updatedAt
});

/**
 * Compound indexes for efficient querying
 */
dlqMessageSchema.index({ status: 1, createdAt: -1 });
dlqMessageSchema.index({ 'metadata.source': 1, status: 1 });
dlqMessageSchema.index({ status: 1, nextRetryAt: 1 });
dlqMessageSchema.index({ errorType: 1, createdAt: -1 });
dlqMessageSchema.index({ status: 1, 'metadata.priority': 1, createdAt: 1 });

/**
 * Instance Methods
 */

/**
 * Add a replay attempt to the history
 * @param {Object} attempt - Replay attempt details
 * @returns {Promise<DLQMessage>}
 */
dlqMessageSchema.methods.addReplayAttempt = function (attempt) {
    this.replayAttempts.push(attempt);
    return this.save();
};

/**
 * Mark message as resolved
 * @param {string} resolvedBy - Worker ID or user who resolved it
 * @param {string} notes - Resolution notes
 * @returns {Promise<DLQMessage>}
 */
dlqMessageSchema.methods.markAsResolved = function (resolvedBy, notes) {
    this.status = 'dlq_resolved';
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
    this.resolutionNotes = notes;
    this.lockedBy = null;
    this.lockedAt = null;
    return this.save();
};

/**
 * Mark message as permanently failed
 * @returns {Promise<DLQMessage>}
 */
dlqMessageSchema.methods.markAsFailed = function () {
    this.status = 'dlq_failed';
    this.lockedBy = null;
    this.lockedAt = null;
    return this.save();
};

/**
 * Mark message for manual intervention
 * @returns {Promise<DLQMessage>}
 */
dlqMessageSchema.methods.markAsManual = function () {
    this.status = 'dlq_manual';
    this.lockedBy = null;
    this.lockedAt = null;
    return this.save();
};

/**
 * Acquire processing lock
 * @param {string} workerId - Worker ID acquiring the lock
 * @returns {Promise<DLQMessage>}
 */
dlqMessageSchema.methods.acquireLock = function (workerId) {
    this.lockedBy = workerId;
    this.lockedAt = new Date();
    this.status = 'dlq_processing';
    return this.save();
};

/**
 * Release processing lock
 * @returns {Promise<DLQMessage>}
 */
dlqMessageSchema.methods.releaseLock = function () {
    this.lockedBy = null;
    this.lockedAt = null;
    this.status = 'dlq_pending';
    return this.save();
};

/**
 * Update next retry time
 * @param {Date} nextRetryAt - Next retry timestamp
 * @returns {Promise<DLQMessage>}
 */
dlqMessageSchema.methods.scheduleRetry = function (nextRetryAt) {
    this.nextRetryAt = nextRetryAt;
    this.dlqRetryCount++;
    this.status = 'dlq_pending';
    this.lockedBy = null;
    this.lockedAt = null;
    return this.save();
};

/**
 * Static Methods
 */

/**
 * Find pending messages ready for retry
 * @param {number} limit - Maximum number of messages to return
 * @returns {Promise<DLQMessage[]>}
 */
dlqMessageSchema.statics.findPendingMessages = function (limit = 10) {
    return this.find({
        status: 'dlq_pending',
        $or: [
            { nextRetryAt: { $lte: new Date() } },
            { nextRetryAt: null }
        ],
        lockedBy: null
    })
        .sort({ 'metadata.priority': 1, createdAt: 1 })
        .limit(limit);
};

/**
 * Clear stale locks (locks held longer than timeout)
 * @param {number} timeoutMs - Lock timeout in milliseconds
 * @returns {Promise<number>} Number of locks cleared
 */
dlqMessageSchema.statics.clearStaleLocks = async function (timeoutMs = 300000) {
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

/**
 * Get statistics by status
 * @returns {Promise<Object>} Status counts
 */
dlqMessageSchema.statics.getStatusStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    return stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
    }, {});
};

/**
 * Get statistics by error type
 * @returns {Promise<Object>} Error type counts
 */
dlqMessageSchema.statics.getErrorTypeStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$errorType',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    return stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
    }, {});
};

/**
 * Create and export the model
 */
const DLQMessage = mongoose.model('DLQMessage', dlqMessageSchema);

module.exports = DLQMessage;
