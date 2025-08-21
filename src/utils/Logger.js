class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(`[${this.getTimestamp()}] INFO: ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(`[${this.getTimestamp()}] WARN: ${message}`, ...args);
    }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(`[${this.getTimestamp()}] ERROR: ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.debug(`[${this.getTimestamp()}] DEBUG: ${message}`, ...args);
    }
  }

  shouldLog(level) {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    return levels[level] <= levels[this.logLevel];
  }
}

module.exports = Logger;
