const logger = require('../utils/logger').createComponentLogger('circuit-breaker');
const config = require('../utils/config');

class CircuitBreaker {
  constructor() {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastStateChange = Date.now();
    this.halfOpenSuccesses = 0;
    this.halfOpenFailures = 0;
    this.metricsWindow = [];
    this.config = config.circuitBreaker;
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring loop
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.evaluateState();
    }, this.config.evaluationIntervalMs);

    logger.info('Circuit breaker monitoring started');
  }

  /**
   * Stop monitoring loop
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Circuit breaker monitoring stopped');
    }
  }

  /**
   * Record successful operation
   */
  async recordSuccess() {
    this.successCount++;
    this.requestCount++;
    this.addMetric({ type: 'success', timestamp: Date.now() });

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      await this.evaluateHalfOpenState();
    }
  }

  /**
   * Record failed operation
   */
  async recordFailure() {
    this.failureCount++;
    this.requestCount++;
    this.addMetric({ type: 'failure', timestamp: Date.now() });

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN re-opens circuit
      this.halfOpenFailures++;
      await this.transitionTo('OPEN');
    }
  }

  /**
   * Add metric to sliding window
   */
  addMetric(metric) {
    this.metricsWindow.push(metric);

    // Remove metrics outside time window
    const cutoff = Date.now() - this.config.timeWindowMs;
    this.metricsWindow = this.metricsWindow.filter(
      m => m.timestamp > cutoff
    );
  }

  /**
   * Calculate failure rate from sliding window
   */
  getFailureRate() {
    if (this.metricsWindow.length < this.config.minimumRequests) {
      return 0; // Not enough data
    }

    const failures = this.metricsWindow.filter(m => m.type === 'failure').length;
    return failures / this.metricsWindow.length;
  }

  /**
   * Evaluate circuit state
   */
  async evaluateState() {
    if (this.state === 'CLOSED') {
      const failureRate = this.getFailureRate();
      if (failureRate >= this.config.failureThreshold) {
        await this.transitionTo('OPEN');
      }
    } else if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastStateChange;
      if (elapsed >= this.config.openTimeoutMs) {
        await this.transitionTo('HALF_OPEN');
      }
    }
  }

  /**
   * Evaluate HALF_OPEN state
   */
  async evaluateHalfOpenState() {
    const totalTests = this.halfOpenSuccesses + this.halfOpenFailures;

    if (totalTests >= this.config.halfOpenMaxRequests) {
      const successRate = this.halfOpenSuccesses / totalTests;

      if (successRate >= this.config.halfOpenSuccessThreshold) {
        await this.transitionTo('CLOSED');
      } else {
        await this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Transition to new state
   */
  async transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    logger.info(`Circuit breaker state transition: ${oldState} → ${newState}`, {
      failureRate: this.getFailureRate(),
      metricsCount: this.metricsWindow.length
    });

    if (newState === 'OPEN') {
      await this.onCircuitOpen();
    } else if (newState === 'CLOSED') {
      await this.onCircuitClose();
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenSuccesses = 0;
      this.halfOpenFailures = 0;
    }

    // Emit alert if configured
    if (this.config.alerting.enabled) {
      this.emitAlert(oldState, newState);
    }
  }

  /**
   * Handle circuit opening
   */
  async onCircuitOpen() {
    logger.warn('Circuit breaker OPEN - blocking new requests', {
      failureRate: this.getFailureRate(),
      threshold: this.config.failureThreshold
    });

    // In production, this would:
    // - Pause message queue dequeuing
    // - Send critical alerts
    // - Update monitoring dashboards
  }

  /**
   * Handle circuit closing
   */
  async onCircuitClose() {
    logger.info('Circuit breaker CLOSED - resuming normal operation');

    // Reset metrics
    this.metricsWindow = [];
    this.halfOpenSuccesses = 0;
    this.halfOpenFailures = 0;

    // In production, this would:
    // - Resume message queue dequeuing
    // - Send recovery alerts
    // - Flush any buffered DLQ messages
  }

  /**
   * Check if request should be allowed
   */
  shouldAllowRequest() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      return false;
    }

    if (this.state === 'HALF_OPEN') {
      // Allow only limited requests in HALF_OPEN
      const totalTests = this.halfOpenSuccesses + this.halfOpenFailures;
      return totalTests < this.config.halfOpenMaxRequests;
    }

    return false;
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get retry-after time in seconds
   */
  getRetryAfter() {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastStateChange;
      const remaining = this.config.openTimeoutMs - elapsed;
      return Math.ceil(remaining / 1000);
    }
    return null;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failureRate: this.getFailureRate(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      metricsWindowSize: this.metricsWindow.length,
      lastStateChange: new Date(this.lastStateChange),
      stateDurationMs: Date.now() - this.lastStateChange,
      halfOpenSuccesses: this.halfOpenSuccesses,
      halfOpenFailures: this.halfOpenFailures
    };
  }

  /**
   * Emit alert for state change
   */
  emitAlert(oldState, newState) {
    const alert = {
      timestamp: new Date(),
      oldState,
      newState,
      failureRate: this.getFailureRate(),
      metricsCount: this.metricsWindow.length
    };

    if (newState === 'OPEN' && this.config.alerting.alertOnTrip) {
      logger.error('ALERT: Circuit breaker tripped', alert);
    }

    if (newState === 'CLOSED' && this.config.alerting.alertOnClose) {
      logger.info('ALERT: Circuit breaker closed', alert);
    }
  }

  /**
   * Force state change (admin only)
   */
  async forceState(newState) {
    logger.warn(`Forcing circuit breaker state to ${newState}`);
    await this.transitionTo(newState);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.metricsWindow = [];
    logger.info('Circuit breaker metrics reset');
  }
}

module.exports = new CircuitBreaker();
