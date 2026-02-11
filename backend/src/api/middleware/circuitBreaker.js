const circuitBreaker = require('../../circuit-breaker/circuitBreaker');
const logger = require('../../utils/logger').createComponentLogger('circuit-breaker-middleware');

/**
 * Circuit breaker middleware
 * Blocks requests when circuit is OPEN
 */
const circuitBreakerMiddleware = (req, res, next) => {
  const state = circuitBreaker.getState();

  if (state === 'OPEN') {
    const retryAfter = circuitBreaker.getRetryAfter();
    
    logger.warn('Request blocked by circuit breaker', {
      path: req.path,
      method: req.method,
      state
    });

    return res.status(503)
      .set('Retry-After', retryAfter)
      .json({
        success: false,
        error: 'Service temporarily unavailable',
        reason: 'Circuit breaker is open',
        retryAfter: `${retryAfter} seconds`,
        state
      });
  }

  if (state === 'HALF_OPEN') {
    const allowRequest = circuitBreaker.shouldAllowRequest();
    
    if (!allowRequest) {
      logger.warn('Request blocked in HALF_OPEN state', {
        path: req.path,
        method: req.method
      });

      return res.status(503).json({
        success: false,
        error: 'Service in recovery mode',
        reason: 'Limited traffic allowed',
        state
      });
    }
  }

  next();
};

module.exports = circuitBreakerMiddleware;
