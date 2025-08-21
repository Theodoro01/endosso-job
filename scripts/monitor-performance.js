#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

// Configurações
const LOG_FILE = process.env.LOG_FILE || '/srv/fgts-system/logs/fgts-system.log';
const STATS_FILE = process.env.STATS_FILE || '/srv/fgts-system/logs/stats.json';

class PerformanceMonitor {
  constructor() {
    this.stats = {
      startTime: Date.now(),
      processed: 0,
      failed: 0,
      avgProcessingTime: 0,
      peakProcessingRate: 0,
      currentQueueSize: 0,
      maxQueueSize: 0
    };
  }

  // Analisar logs para extrair estatísticas
  async analyzeLogs() {
    try {
      if (!await fs.pathExists(LOG_FILE)) {
        console.log('📋 Arquivo de log não encontrado');
        return this.stats;
      }

      const logContent = await fs.readFile(LOG_FILE, 'utf8');
      const lines = logContent.split('\n');

      let processedCount = 0;
      let failedCount = 0;
      let processingTimes = [];

      for (const line of lines) {
        // Contar arquivos processados com sucesso
        if (line.includes('✅ Arquivo processado com sucesso:')) {
          processedCount++;
        }

        // Contar falhas
        if (line.includes('💀 Processamento falhou:') || line.includes('❌ Falha ao processar arquivo')) {
          failedCount++;
        }

        // Extrair tempo de processamento (se disponível)
        if (line.includes('Processando arquivo:') && line.includes('ms')) {
          const timeMatch = line.match(/(\d+)ms/);
          if (timeMatch) {
            processingTimes.push(parseInt(timeMatch[1]));
          }
        }
      }

      // Calcular estatísticas
      this.stats.processed = processedCount;
      this.stats.failed = failedCount;
      this.stats.avgProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : 0;

      // Calcular taxa de processamento
      const uptime = (Date.now() - this.stats.startTime) / 60000; // minutos
      this.stats.processedPerMinute = uptime > 0 ? (processedCount / uptime).toFixed(2) : 0;

      return this.stats;

    } catch (error) {
      console.error('❌ Erro ao analisar logs:', error.message);
      return this.stats;
    }
  }

  // Gerar relatório de performance
  generateReport() {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    console.log('\n📊 RELATÓRIO DE PERFORMANCE - SISTEMA FGTS');
    console.log('==========================================');
    console.log(`⏱️  Tempo de execução: ${hours}h ${minutes}m`);
    console.log(`📈 Arquivos processados: ${this.stats.processed}`);
    console.log(`❌ Falhas: ${this.stats.failed}`);
    console.log(`📊 Taxa de sucesso: ${this.stats.processed > 0 ? ((this.stats.processed / (this.stats.processed + this.stats.failed)) * 100).toFixed(1) : 0}%`);
    console.log(`⚡ Taxa de processamento: ${this.stats.processedPerMinute} arquivos/minuto`);
    console.log(`⏳ Tempo médio de processamento: ${this.stats.avgProcessingTime.toFixed(0)}ms`);
    
    if (this.stats.processed > 0) {
      console.log(`📅 Estimativa para 1000 arquivos: ${Math.ceil(1000 / parseFloat(this.stats.processedPerMinute))} minutos`);
      console.log(`📅 Estimativa para 10000 arquivos: ${Math.ceil(10000 / parseFloat(this.stats.processedPerMinute))} minutos`);
    }

    console.log('\n🎯 RECOMENDAÇÕES:');
    
    if (parseFloat(this.stats.processedPerMinute) < 5) {
      console.log('⚠️  Performance baixa detectada:');
      console.log('   - Considere aumentar MAX_CONCURRENT');
      console.log('   - Verifique recursos do servidor (CPU/RAM)');
      console.log('   - Otimize template DOCX se necessário');
    } else if (parseFloat(this.stats.processedPerMinute) > 20) {
      console.log('✅ Performance excelente!');
      console.log('   - Sistema operando em alta capacidade');
      console.log('   - Pode processar grandes volumes');
    } else {
      console.log('✅ Performance adequada');
      console.log('   - Sistema operando normalmente');
    }

    if (this.stats.failed > this.stats.processed * 0.1) {
      console.log('⚠️  Taxa de falha alta:');
      console.log('   - Verifique logs de erro');
      console.log('   - Valide formato dos arquivos de entrada');
      console.log('   - Verifique conectividade com AWS');
    }
  }

  // Monitorar em tempo real
  async monitorRealTime() {
    console.log('🔍 Monitorando performance em tempo real...');
    console.log('Pressione Ctrl+C para parar\n');

    let lastProcessed = 0;
    let lastTime = Date.now();

    const interval = setInterval(async () => {
      const currentStats = await this.analyzeLogs();
      const currentTime = Date.now();
      
      const newProcessed = currentStats.processed - lastProcessed;
      const timeDiff = (currentTime - lastTime) / 1000; // segundos
      const currentRate = timeDiff > 0 ? (newProcessed / timeDiff * 60).toFixed(2) : 0;

      console.log(`\r📊 Processados: ${currentStats.processed} | Taxa atual: ${currentRate} arquivos/min | Falhas: ${currentStats.failed}`, '');

      lastProcessed = currentStats.processed;
      lastTime = currentTime;
    }, 5000);

    // Parar com Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n\n📋 Relatório final:');
      this.generateReport();
      process.exit(0);
    });
  }
}

// Executar monitoramento
async function main() {
  const monitor = new PerformanceMonitor();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--realtime') || args.includes('-r')) {
    await monitor.monitorRealTime();
  } else {
    const stats = await monitor.analyzeLogs();
    monitor.generateReport();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceMonitor;
