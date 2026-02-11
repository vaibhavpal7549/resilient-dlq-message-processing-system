const Redis = require('ioredis');
const logger = require('../utils/logger').createComponentLogger('redis');
const config = require('../utils/config');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        if (this.isConnected) {
          logger.info('Redis already connected');
          return resolve(this.client);
        }

        logger.info('Connecting to Redis...', {
          host: config.redis.host,
          port: config.redis.port
        });

        this.client = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
            return delay;
          },
          maxRetriesPerRequest: 3
        });

        this.client.on('connect', () => {
          logger.info('Redis connected successfully');
          this.isConnected = true;
          resolve(this.client);
        });

        this.client.on('error', (err) => {
          logger.error('Redis connection error:', err);
          this.isConnected = false;
          if (!this.client) {
            reject(err);
          }
        });

        this.client.on('close', () => {
          logger.warn('Redis connection closed');
          this.isConnected = false;
        });

        this.client.on('reconnecting', () => {
          logger.info('Redis reconnecting...');
        });

      } catch (error) {
        logger.error('Failed to create Redis client:', error);
        reject(error);
      }
    });
  }

  async disconnect() {
    try {
      if (!this.client) {
        return;
      }

      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  async isHealthy() {
    try {
      if (!this.client) {
        return false;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }
}

module.exports = new RedisClient();
