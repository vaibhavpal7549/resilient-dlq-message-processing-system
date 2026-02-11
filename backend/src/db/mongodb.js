const mongoose = require('mongoose');
const logger = require('../utils/logger').createComponentLogger('mongodb');
const config = require('../utils/config');

class MongoDB {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.info('MongoDB already connected');
        return this.connection;
      }

      logger.info('Connecting to MongoDB...', { uri: config.mongodb.uri.replace(/\/\/.*@/, '//***@') });

      mongoose.set('strictQuery', false);

      this.connection = await mongoose.connect(config.mongodb.uri, {
        maxPoolSize: config.mongodb.poolSize,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });

      this.isConnected = true;
      logger.info('MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (!this.isConnected) {
        return;
      }

      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('MongoDB disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isHealthy() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

module.exports = new MongoDB();
