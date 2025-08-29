require('dotenv').config();
const FolderWatcher = require('./services/FolderWatcher');
const MemoryMonitor = require('./utils/MemoryMonitor');
const config = require('./config/config');

console.log('🚀 Iniciando sistema de processamento FGTS...');
console.log(`📁 Pasta de entrada: ${config.inputFolder}`);
console.log(`📁 Pasta de saída: ${config.outputFolder}`);
console.log(`📁 Pasta de templates: ${config.templatesFolder}`);

// Verificar configurações de memória
const gc = global.gc;
if (gc) {
  console.log('✅ Garbage collector habilitado');
} else {
  console.warn('⚠️  Garbage collector não está disponível. Execute com --expose-gc');
}

// Iniciar monitoramento de memória
const memoryMonitor = new MemoryMonitor();
memoryMonitor.startMonitoring();

const watcher = new FolderWatcher();
watcher.startWatching();

// Configurar graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Recebido sinal de interrupção...');
  memoryMonitor.stopMonitoring();
  watcher.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido sinal de término...');
  memoryMonitor.stopMonitoring();
  watcher.stop();
  process.exit(0);
});
