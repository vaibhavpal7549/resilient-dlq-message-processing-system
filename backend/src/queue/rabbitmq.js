const amqp = require('amqplib');
const EventEmitter = require('events');
const logger = require('../utils/logger').createComponentLogger('rabbitmq');
const config = require('../utils/config');

class RabbitMQClient extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this._reconnectTimer = null;
    this._intentionalClose = false;
  }

  async connect() {
    try {
      if (this.isConnected && this.channel) {
        logger.info('RabbitMQ already connected');
        return this.channel;
      }

      // Clean up any stale references
      this.channel = null;
      this.isConnected = false;

      const url = config.rabbitmq.url;
      logger.info('Connecting to RabbitMQ...', {
        url: url.replace(/\/\/.*@/, '//***@') // Hide credentials in logs
      });

      this.connection = await amqp.connect(url);

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        this.channel = null;
        if (!this._intentionalClose) {
          this._scheduleReconnect();
        }
      });

      this.channel = await this.connection.createChannel();

      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error:', err);
      });

      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
        this.channel = null;
        this.isConnected = false;
        // Channel can die independently of connection (e.g., CloudAMQP limits)
        // Schedule reconnect to get a fresh channel
        if (!this._intentionalClose) {
          this._scheduleReconnect();
        }
      });

      this.isConnected = true;
      logger.info('RabbitMQ connected successfully');

      // Emit 'reconnected' so queueManager can re-register consumer
      this.emit('reconnected', this.channel);

      return this.channel;

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      throw error;
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    logger.info('Scheduling RabbitMQ reconnection in 5 seconds...');
    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      try {
        // Force-clean stale connection before reconnecting
        try {
          if (this.connection) {
            this.connection.removeAllListeners();
            await this.connection.close().catch(() => {});
          }
        } catch { /* ignore cleanup errors */ }
        this.connection = null;
        this.channel = null;
        this.isConnected = false;

        logger.info('Attempting RabbitMQ reconnection...');
        await this.connect();
        logger.info('RabbitMQ reconnection successful');
      } catch (err) {
        logger.error('RabbitMQ reconnection failed:', err);
        this._scheduleReconnect();
      }
    }, 5000);
  }

  async disconnect() {
    try {
      this._intentionalClose = true;

      if (this._reconnectTimer) {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;
      }

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.isConnected = false;
      logger.info('RabbitMQ disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting from RabbitMQ:', error);
      this.isConnected = false;
    }
  }

  getChannel() {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ channel not available');
    }
    return this.channel;
  }

  async isHealthy() {
    try {
      if (!this.connection || !this.channel) {
        return false;
      }
      // Check queue exists as a health probe
      await this.channel.checkQueue(config.queue.name);
      return true;
    } catch (error) {
      logger.error('RabbitMQ health check failed:', error);
      return false;
    }
  }
}

module.exports = new RabbitMQClient();
