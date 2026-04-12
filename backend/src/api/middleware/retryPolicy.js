const config = require('../../utils/config');

const attachRetryPolicy = (req, res, next) => {
  req.retryPolicy = {
    maxRetries: config.retryPolicies.maxRetries,
    baseBackoffMs: config.retryPolicies.baseBackoffMs,
    maxBackoffMs: config.retryPolicies.maxBackoffMs,
    jitterPercent: config.retryPolicies.jitterPercent
  };

  next();
};

module.exports = {
  attachRetryPolicy
};
