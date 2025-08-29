#!/usr/bin/env node

/**
 * Script para testar configurações de memória
 * Execute: node scripts/test-memory.js
 */

const MemoryMonitor = require('../src/utils/MemoryMonitor');

console.log('🧪 Testando configurações de memória...\n');

// Verificar se o garbage collector está disponível
const gc = global.gc;
if (gc) {
  console.log('✅ Garbage collector habilitado');
} else {
  console.warn('⚠️  Garbage collector não está disponível');
  console.log('💡 Execute com: node --max-old-space-size=8192 --expose-gc scripts/test-memory.js');
}

// Iniciar monitor de memória
const memoryMonitor = new MemoryMonitor();

console.log('\n📊 Status inicial da memória:');
memoryMonitor.logMemoryUsage();

// Simular uso de memória
console.log('\n🔧 Simulando uso de memória...');
const largeArray = [];
for (let i = 0; i < 1000000; i++) {
  largeArray.push({
    id: i,
    data: `Dados de teste ${i}`,
    timestamp: Date.now(),
    metadata: {
      source: 'test',
      version: '1.0',
      category: 'memory-test'
    }
  });
}

console.log('📊 Memória após criar array grande:');
memoryMonitor.logMemoryUsage();

// Forçar garbage collection
console.log('\n🧹 Executando garbage collection...');
const success = memoryMonitor.forceGarbageCollection();

if (success) {
  console.log('📊 Memória após garbage collection:');
  memoryMonitor.logMemoryUsage();
}

// Limpar referência
largeArray.length = 0;
largeArray.splice(0, largeArray.length);

console.log('\n📊 Memória após limpar referências:');
memoryMonitor.logMemoryUsage();

// Forçar garbage collection novamente
console.log('\n🧹 Executando garbage collection final...');
memoryMonitor.forceGarbageCollection();

console.log('\n📊 Status final da memória:');
memoryMonitor.logMemoryUsage();

console.log('\n✅ Teste de memória concluído!');
