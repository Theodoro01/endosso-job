module.exports = {
  // Configurações das pastas
  inputFolder: process.env.INPUT_FOLDER,
  outputFolder: process.env.OUTPUT_FOLDER,
  templatesFolder: process.env.TEMPLATES_FOLDER,

  // Nome do template
  templateFileName: "4fad41b1671a1b2b5983c194ac4007b1-334acd01dd232b74d2.docx",

  // Configurações de processamento
  supportedExtensions: [".pdf"],
  maxFileSize: 50 * 1024 * 1024, // 50MB

  // Configurações de log
  logLevel: process.env.LOG_LEVEL || "info",

  // Configurações de retry
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo

  // Configurações de processamento paralelo
  maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 3,
  maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE) || 100,

  // Configurações de timeout
  processTimeout: parseInt(process.env.PROCESS_TIMEOUT) || 300000, // 5 minutos

  // Configurações de memória
  maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE) || 1024, // 1GB
};
