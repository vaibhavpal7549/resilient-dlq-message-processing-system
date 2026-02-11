require('dotenv').config();
const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
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

  get redis() {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0
    };
  }

  get queue() {
    return {
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 10,
      maxSize: parseInt(process.env.QUEUE_MAX_SIZE) || 100000
    };
  }

  get dlq() {
    return {
      pollIntervalMs: parseInt(process.env.DLQ_POLL_INTERVAL_MS) || 30000,
      batchSize: parseInt(process.env.DLQ_BATCH_SIZE) || 10,
      maxRetries: parseInt(process.env.DLQ_MAX_RETRIES) || 5
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
