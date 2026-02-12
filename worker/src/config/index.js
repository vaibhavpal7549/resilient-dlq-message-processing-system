/**
 * Configuration Management Module
 * 
 * Centralizes all configuration loading and validation for the DLQ worker service.
 * Loads environment variables and provides typed configuration objects.
 */

require('dotenv').config();

/**
 * Validates required environment variables
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {*} The environment variable value or default
 */
function getEnvVar(key, defaultValue = null) {
  const value = process.env[key];
  if (value === undefined && defaultValue === null) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue;
}

/**
 * Parse integer from environment variable
 */
function getEnvInt(key, defaultValue) {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * Parse boolean from environment variable
 */
function getEnvBool(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * MongoDB Configuration
 */
const mongodb = {
  uri: getEnvVar('MONGODB_URI', 'mongodb://localhost:27017/dlq_system'),
  poolSize: getEnvInt('MONGODB_POOL_SIZE', 10),
  options: {
    maxPoolSize: getEnvInt('MONGODB_POOL_SIZE', 10),
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};

/**
 * Redis Configuration
 */
const redis = {
  host: getEnvVar('REDIS_HOST', 'localhost'),
  port: getEnvInt('REDIS_PORT', 6379),
  password: getEnvVar('REDIS_PASSWORD', ''),
  db: getEnvInt('REDIS_DB', 0),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

/**
 * DLQ Worker Configuration
 */
const dlq = {
  // Polling interval in milliseconds (how often to check for new messages)
  pollIntervalMs: getEnvInt('DLQ_POLL_INTERVAL_MS', 30000),
  
  // Number of messages to process in each batch
  batchSize: getEnvInt('DLQ_BATCH_SIZE', 10),
  
  // Maximum number of retry attempts for DLQ messages
  maxRetries: getEnvInt('DLQ_MAX_RETRIES', 5),
  
  // Lock timeout in milliseconds (stale lock cleanup)
  lockTimeoutMs: getEnvInt('DLQ_LOCK_TIMEOUT_MS', 300000), // 5 minutes
  
  // Retry backoff configuration (in minutes)
  retryBackoffMinutes: [1, 5, 15, 30, 60],
  
  // Off-peak retry hour (for scheduled retries)
  offPeakHour: getEnvInt('DLQ_OFF_PEAK_HOUR', 2),
};

/**
 * Logging Configuration
 */
const logging = {
  level: getEnvVar('LOG_LEVEL', 'info'),
  file: getEnvVar('LOG_FILE', 'logs/dlq-worker.log'),
  console: getEnvBool('LOG_CONSOLE', true),
  json: getEnvBool('LOG_JSON', false),
};

/**
 * Error Classification Configuration
 * Defines which error types are considered temporary vs permanent
 */
const errorClassification = {
  // Temporary errors - should be retried
  temporary: [
    'TIMEOUT_ERROR',
    'CONNECTION_ERROR',
    'RATE_LIMIT_ERROR',
    'SERVICE_UNAVAILABLE',
    'NETWORK_ERROR',
    'TEMPORARY_FAILURE'
  ],
  
  // Permanent errors - should not be retried
  permanent: [
    'VALIDATION_ERROR',
    'AUTHORIZATION_ERROR',
    'NOT_FOUND_ERROR',
    'BUSINESS_LOGIC_ERROR',
    'SCHEMA_ERROR',
    'INVALID_REQUEST'
  ],
  
  // Unknown errors - require manual intervention
  manual: [
    'UNKNOWN_ERROR',
    'UNHANDLED_ERROR'
  ]
};

/**
 * Application Configuration
 */
const app = {
  env: getEnvVar('NODE_ENV', 'development'),
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
};

module.exports = {
  mongodb,
  redis,
  dlq,
  logging,
  errorClassification,
  app
};
