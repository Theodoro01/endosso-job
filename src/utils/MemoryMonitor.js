const Logger = require('./Logger');

class MemoryMonitor {
  constructor() {
    this.logger = new Logger();
    this.monitoring = false;
    this.interval = null;
    this.checkInterval = 30000; // 30 segundos
  }

  startMonitoring() {
    if (this.monitoring) {
      this.logger.warn('Monitoramento de memória já está ativo');
      return;
    }

    this.monitoring = true;
    this.logger.info('🔍 Iniciando monitoramento de memória...');

    this.interval = setInterval(() => {
      this.logMemoryUsage();
    }, this.checkInterval);

    // Log inicial
    this.logMemoryUsage();
  }

  stopMonitoring() {
    if (!this.monitoring) {
      return;
    }

    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.logger.info('🛑 Monitoramento de memória parado');
  }

  logMemoryUsage() {
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => {
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    const memoryInfo = {
      rss: formatBytes(usage.rss),           // Resident Set Size
      heapTotal: formatBytes(usage.heapTotal), // Total heap size
      heapUsed: formatBytes(usage.heapUsed),   // Heap actually used
      external: formatBytes(usage.external),   // Memory used by C++ objects
      arrayBuffers: formatBytes(usage.arrayBuffers || 0) // Memory used by ArrayBuffers
    };

    const heapUsagePercent = ((usage.heapUsed / usage.heapTotal) * 100).toFixed(2);

    this.logger.info(`💾 Uso de Memória:
      RSS: ${memoryInfo.rss}
      Heap Total: ${memoryInfo.heapTotal}
      Heap Usado: ${memoryInfo.heapUsed} (${heapUsagePercent}%)
      External: ${memoryInfo.external}
      Array Buffers: ${memoryInfo.arrayBuffers}`);

    // Alertar se o uso de heap estiver alto
    if (parseFloat(heapUsagePercent) > 80) {
      this.logger.warn(`⚠️  Uso de heap alto: ${heapUsagePercent}%`);
    }

    if (parseFloat(heapUsagePercent) > 90) {
      this.logger.error(`🚨 Uso de heap crítico: ${heapUsagePercent}%`);
    }
  }

  forceGarbageCollection() {
    const gc = global.gc;
    if (!gc) {
      this.logger.warn('⚠️  Garbage collector não está disponível');
      return false;
    }

    try {
      const beforeUsage = process.memoryUsage();
      gc();
      const afterUsage = process.memoryUsage();
      
      const freedMemory = beforeUsage.heapUsed - afterUsage.heapUsed;
      const freedMB = (freedMemory / 1024 / 1024).toFixed(2);
      
      this.logger.info(`🧹 Garbage collection executado. Memória liberada: ${freedMB} MB`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao executar garbage collection: ${error.message}`);
      return false;
    }
  }

  getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers || 0,
      heapUsagePercent: ((usage.heapUsed / usage.heapTotal) * 100).toFixed(2)
    };
  }
}

module.exports = MemoryMonitor;
