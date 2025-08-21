const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config/config');
const QueueProcessor = require('./QueueProcessor');
const Logger = require('../utils/Logger');

class FolderWatcher {
  constructor() {
    this.watcher = null;
    this.queueProcessor = new QueueProcessor();
    this.logger = new Logger();
    
    // Configurar eventos da fila
    this.queueProcessor.on('processed', (data) => {
      this.logger.info(`✅ Processamento concluído: ${path.basename(data.filePath)}`);
    });
    
    this.queueProcessor.on('failed', (data) => {
      this.logger.error(`💀 Processamento falhou: ${path.basename(data.filePath)} - ${data.error}`);
    });
  }

  startWatching() {
    this.logger.info('Iniciando monitoramento da pasta...');
    
    // Criar pastas se não existirem
    this.ensureDirectories();
    
    // Configurar o watcher
    this.watcher = chokidar.watch(config.inputFolder, {
      ignored: /(^|[\/\\])\../, // Ignorar arquivos ocultos
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    // Eventos do watcher
    this.watcher
      .on('add', (filePath) => this.handleNewFile(filePath))
      .on('error', (error) => this.logger.error('Erro no watcher:', error))
      .on('ready', () => this.logger.info('Watcher pronto! Monitorando arquivos...'));
  }

  async handleNewFile(filePath) {
    const fileName = path.basename(filePath);
    
    // Verificar extensão
    const ext = path.extname(filePath).toLowerCase();
    if (!config.supportedExtensions.includes(ext)) {
      this.logger.info(`Arquivo ${fileName} não é suportado (extensão: ${ext})`);
      return;
    }

    // Verificar tamanho
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > config.maxFileSize) {
        this.logger.warn(`Arquivo ${fileName} muito grande (${stats.size} bytes)`);
        return;
      }
    } catch (error) {
      this.logger.error(`Erro ao verificar arquivo ${fileName}:`, error);
      return;
    }

    // Adicionar à fila de processamento
    this.logger.info(`Novo arquivo detectado: ${fileName}`);
    
    const added = this.queueProcessor.addToQueue(filePath);
    if (!added) {
      this.logger.warn(`Fila cheia, arquivo ${fileName} será processado quando houver espaço`);
    }
  }

  // Obter estatísticas do processamento
  getStats() {
    return this.queueProcessor.getStats();
  }

  // Obter status detalhado
  getStatus() {
    return this.queueProcessor.getStatus();
  }

  // Parar processamento
  stop() {
    this.logger.info('Parando sistema de monitoramento...');
    if (this.watcher) {
      this.watcher.close();
    }
    this.queueProcessor.stop();
  }

  ensureDirectories() {
    const directories = [
      config.inputFolder,
      config.outputFolder,
      path.join(config.outputFolder, 'errors'),
      config.templatesFolder
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirpSync(dir);
        this.logger.info(`Pasta criada: ${dir}`);
      }
    });
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.logger.info('Monitoramento parado');
    }
  }
}

module.exports = FolderWatcher;
