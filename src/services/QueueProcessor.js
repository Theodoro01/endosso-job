const EventEmitter = require('events');
const Logger = require('../utils/Logger');
const DocumentProcessor = require('./DocumentProcessor');
const config = require('../config/config');

// Verificar se o garbage collector está disponível
const gc = global.gc;
if (!gc) {
  console.warn('⚠️  Garbage collector não está disponível. Execute com --expose-gc');
}

class QueueProcessor extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger();
    this.processor = new DocumentProcessor();
    this.queue = [];
    this.processing = new Set();
    this.maxConcurrent = config.maxConcurrent || 3;
    this.maxQueueSize = config.maxQueueSize || 100;
    this.isRunning = false;
    
    // Estatísticas
    this.stats = {
      processed: 0,
      failed: 0,
      queued: 0,
      processing: 0,
      startTime: Date.now()
    };
  }

  // Adicionar arquivo à fila
  addToQueue(filePath) {
    if (this.queue.length >= this.maxQueueSize) {
      this.logger.warn(`Fila cheia (${this.maxQueueSize}), rejeitando arquivo: ${filePath}`);
      return false;
    }

    this.queue.push({
      filePath,
      addedAt: Date.now(),
      retries: 0
    });

    this.stats.queued++;
    this.logger.info(`Arquivo adicionado à fila: ${filePath} (fila: ${this.queue.length})`);
    
    // Iniciar processamento se não estiver rodando
    if (!this.isRunning) {
      this.startProcessing();
    }

    return true;
  }

  // Iniciar processamento da fila
  async startProcessing() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logger.info(`Iniciando processamento da fila (máx: ${this.maxConcurrent} simultâneos)`);

    while (this.isRunning && (this.queue.length > 0 || this.processing.size > 0)) {
      // Processar arquivos em paralelo até o limite
      while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
        const item = this.queue.shift();
        this.processFile(item);
      }

      // Aguardar um pouco antes de verificar novamente
      await this.sleep(100);
    }

    this.isRunning = false;
    this.logger.info('Processamento da fila finalizado');
  }

  // Processar arquivo individual
  async processFile(item) {
    const { filePath, retries } = item;
    const fileName = require('path').basename(filePath);

    // Adicionar à lista de processamento
    this.processing.add(filePath);
    this.stats.processing = this.processing.size;

    try {
      this.logger.info(`Processando arquivo: ${fileName} (tentativa ${retries + 1})`);
      
      const result = await this.processor.processDocument(filePath);
      
      if (result.success) {
        this.stats.processed++;
        this.logger.info(`✅ Arquivo processado com sucesso: ${fileName}`);
        this.emit('processed', { filePath, result });
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.logger.error(`❌ Erro ao processar arquivo ${fileName}:`, error.message);
      
      // Tentar novamente se não excedeu o limite de tentativas
      if (retries < config.maxRetries) {
        item.retries++;
        item.addedAt = Date.now();
        
        // Adicionar de volta à fila com delay
        setTimeout(() => {
          this.queue.unshift(item);
          this.stats.queued++;
          this.logger.info(`🔄 Recolocando arquivo na fila: ${fileName} (tentativa ${item.retries + 1})`);
        }, config.retryDelay * (retries + 1));
        
      } else {
        this.stats.failed++;
        this.logger.error(`💀 Arquivo falhou definitivamente: ${fileName} após ${retries + 1} tentativas`);
        this.emit('failed', { filePath, error: error.message });
      }
    } finally {
      this.processing.delete(filePath);
      this.stats.processing = this.processing.size;
      
      // Forçar garbage collection após processamento de cada arquivo
      if (gc) {
        try {
          gc();
          this.logger.debug(`🧹 Garbage collection executado para: ${fileName}`);
        } catch (error) {
          this.logger.warn(`Erro ao executar garbage collection: ${error.message}`);
        }
      }
    }
  }

  // Parar processamento
  stop() {
    this.isRunning = false;
    this.logger.info('Parando processamento da fila...');
  }

  // Obter estatísticas
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const processedPerMinute = (this.stats.processed / (uptime / 60000)).toFixed(2);
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      processedPerMinute,
      queueSize: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize
    };
  }

  // Obter status detalhado
  getStatus() {
    const stats = this.getStats();
    
    return {
      status: this.isRunning ? 'running' : 'stopped',
      queue: {
        size: this.queue.length,
        max: this.maxQueueSize,
        processing: this.processing.size,
        maxConcurrent: this.maxConcurrent
      },
      performance: {
        processed: stats.processed,
        failed: stats.failed,
        processedPerMinute: stats.processedPerMinute,
        uptime: stats.uptime
      },
      files: {
        queued: this.queue.map(item => ({
          file: require('path').basename(item.filePath),
          addedAt: item.addedAt,
          retries: item.retries
        })),
        processing: Array.from(this.processing).map(filePath => 
          require('path').basename(filePath)
        )
      }
    };
  }

  // Utilitário para sleep
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = QueueProcessor;
