const mongoose = require('mongoose');

const CIRCUIT_BREAKER_STATES = [
  'OPEN',
  'CLOSED',
  'HALF_OPEN'
];

const circuitBreakerStateSchema = new mongoose.Schema(
  {
    breakerKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: 'primary'
    },
    state: {
      type: String,
      required: true,
      enum: CIRCUIT_BREAKER_STATES,
      default: 'CLOSED'
    },
    failureCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    threshold: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5
    },
    lastFailureTime: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'circuit_breaker_states'
  }
);

circuitBreakerStateSchema.index({ breakerKey: 1 }, { unique: true, name: 'uq_breaker_key' });
circuitBreakerStateSchema.index({ state: 1, updatedAt: -1 }, { name: 'idx_state_updated_at' });

circuitBreakerStateSchema.methods.recordFailure = function recordFailure() {
  this.failureCount += 1;
  this.lastFailureTime = new Date();
  return this.save();
};

circuitBreakerStateSchema.methods.setState = function setState(nextState) {
  this.state = nextState;
  return this.save();
};

module.exports = {
  CircuitBreakerState: mongoose.model('CircuitBreakerState', circuitBreakerStateSchema),
  CIRCUIT_BREAKER_STATES
};
