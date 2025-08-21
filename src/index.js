require('dotenv').config();
const FolderWatcher = require('./services/FolderWatcher');
const config = require('./config/config');

console.log('🚀 Iniciando sistema de processamento FGTS...');
console.log(`📁 Pasta de entrada: ${config.inputFolder}`);
console.log(`📁 Pasta de saída: ${config.outputFolder}`);
console.log(`📁 Pasta de templates: ${config.templatesFolder}`);

const watcher = new FolderWatcher();
watcher.startWatching();
