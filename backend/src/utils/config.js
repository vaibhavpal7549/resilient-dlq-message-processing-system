const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../..', '.env') });
const fs = require('fs');

class Config {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.projectRoot = path.join(__dirname, '../../..');
    this.loadConfigurations();
  }

  loadConfigurations() {
    // Load retry policies
    const retryPoliciesPath = path.join(__dirname, '../../config/retry-policies.json');
    this.retryPolicies = JSON.parse(fs.readFileSync(retryPoliciesPath, 'utf8'));

    // Load circuit breaker config
    const circuitBreakerPath = path.join(__dirname, '../../config/circuit-breaker.json');
    this.circuitBreaker = JSON.parse(fs.readFileSync(circuitBreakerPath, 'utf8'));
  }

  get server() {
    return {
      port: parseInt(process.env.PORT) || 3000,
      env: this.env
    };
  }

  get mongodb() {
    return {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dlq_system',
      poolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 10,
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    };
  }

  get rabbitmq() {
    return {
      url: process.env.RABBITMQ_URL || 'amqp://localhost'
    };
  }

  get queue() {
    return {
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 10,
      maxSize: parseInt(process.env.QUEUE_MAX_SIZE) || 100000,
      name: process.env.QUEUE_NAME || 'message-processing'
    };
  }

  get dlq() {
    return {
      pollIntervalMs: parseInt(process.env.DLQ_POLL_INTERVAL_MS) || 30000,
      batchSize: parseInt(process.env.DLQ_BATCH_SIZE) || 10,
      maxRetries: parseInt(process.env.DLQ_MAX_RETRIES) || 5,
      lockTimeoutMs: parseInt(process.env.DLQ_LOCK_TIMEOUT_MS) || 300000,
      retryBackoffMinutes: this.retryPolicies.dlqRetries?.immediate || [1, 5, 15, 30, 60],
      offPeakHour: parseInt(process.env.DLQ_OFF_PEAK_HOUR) || 2,
      replayBatchLimit: parseInt(process.env.DLQ_REPLAY_BATCH_LIMIT) || 100,
      policyVersion: process.env.DLQ_POLICY_VERSION || this.retryPolicies.policyVersion || 'git-tracked-v1'
    };
  }

  get spool() {
    return {
      enabled: process.env.DLQ_SPOOL_ENABLED !== 'false',
      directory: path.resolve(this.projectRoot, process.env.DLQ_SPOOL_DIR || path.join('scripts', 'unix-dlq-spool')),
      replayBatchSize: parseInt(process.env.DLQ_SPOOL_REPLAY_BATCH_SIZE) || 50
    };
  }

  get project() {
    return {
      name: process.env.PROJECT_NAME || 'Dead Letter Queue Handler'
    };
  }

  get logging() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || 'logs/app.log'
    };
  }

  get metrics() {
    return {
      enabled: process.env.METRICS_ENABLED === 'true',
      port: parseInt(process.env.METRICS_PORT) || 9090
    };
  }

  get rateLimit() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    };
  }
}

module.exports = new Config();
