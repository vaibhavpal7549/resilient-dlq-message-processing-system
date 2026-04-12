const fs = require('fs');
const path = require('path');
const config = require('../utils/config');
const logger = require('../utils/logger').createComponentLogger('unix-spool');

class UnixSpool {
  constructor() {
    this.directory = config.spool.directory;
  }

  ensureDirectory() {
    if (!config.spool.enabled) {
      return;
    }

    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
    }
  }

  createFileName(messageId) {
    const safeMessageId = String(messageId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${Date.now()}-${safeMessageId}.json`;
  }

  async enqueue(entry) {
    if (!config.spool.enabled) {
      throw new Error('Unix spool is disabled');
    }

    this.ensureDirectory();
    const fileName = this.createFileName(entry.messageId);
    const absolutePath = path.join(this.directory, fileName);

    await fs.promises.writeFile(absolutePath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
    logger.warn('DLQ overflow stored in unix spool', {
      messageId: entry.messageId,
      fileName
    });

    return {
      fileName,
      absolutePath
    };
  }

  async list() {
    if (!config.spool.enabled) {
      return [];
    }

    this.ensureDirectory();
    const names = await fs.promises.readdir(this.directory);

    return names
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => ({
        fileName: name,
        absolutePath: path.join(this.directory, name)
      }));
  }

  async read(fileName) {
    const absolutePath = path.join(this.directory, fileName);
    const content = await fs.promises.readFile(absolutePath, 'utf8');
    return JSON.parse(content);
  }

  async remove(fileName) {
    const absolutePath = path.join(this.directory, fileName);
    await fs.promises.unlink(absolutePath);
  }

  async getStats() {
    const entries = await this.list();
    return {
      enabled: config.spool.enabled,
      directory: this.directory,
      queuedFiles: entries.length
    };
  }
}

module.exports = new UnixSpool();
