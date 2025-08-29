# Configurações de Memória - Sistema FGTS

## Visão Geral

Este documento descreve as configurações de memória implementadas no sistema de processamento FGTS para otimizar o uso de recursos e evitar vazamentos de memória.

## Configurações Implementadas

### 1. Limite de Memória Heap (8GB)

O Node.js foi configurado para usar até 8GB de memória heap:

```bash
--max-old-space-size=8192
```

### 2. Garbage Collector Manual

O garbage collector foi habilitado para controle manual:

```bash
--expose-gc
```

### 3. Monitoramento de Memória

Um sistema de monitoramento foi implementado para acompanhar o uso de memória em tempo real.

## Scripts Disponíveis

### Produção
```bash
npm start
```
- Usa 8GB de memória heap
- Garbage collector habilitado
- Monitoramento de memória ativo

### Desenvolvimento
```bash
npm run dev
```
- Usa 8GB de memória heap
- Garbage collector habilitado
- Hot reload com nodemon

### Teste de Memória
```bash
npm run test-memory
```
- Testa as configurações de memória
- Simula uso intensivo de memória
- Demonstra o funcionamento do garbage collector

### Monitoramento Detalhado
```bash
npm run start:monitor
```
- Usa 8GB de memória heap
- Garbage collector habilitado
- Logs detalhados do garbage collector (`--trace-gc`)

## Como Funciona

### 1. Garbage Collection Automático

O sistema executa garbage collection automaticamente após:
- Processamento de cada documento
- Operações de memória intensiva
- Intervalos regulares de monitoramento

### 2. Monitoramento de Memória

O `MemoryMonitor` verifica a cada 30 segundos:
- RSS (Resident Set Size)
- Heap Total e Heap Usado
- Memória Externa
- Array Buffers
- Percentual de uso do heap

### 3. Alertas de Memória

O sistema emite alertas quando:
- Uso de heap > 80%: Aviso
- Uso de heap > 90%: Erro crítico

## Estrutura de Arquivos

```
src/
├── utils/
│   └── MemoryMonitor.js     # Monitor de memória
├── services/
│   ├── QueueProcessor.js    # Garbage collection após cada arquivo
│   └── DocumentProcessor.js # Garbage collection após processamento
└── index.js                 # Inicialização do monitoramento

scripts/
└── test-memory.js          # Script de teste

docs/
└── MEMORY_CONFIG.md        # Esta documentação
```

## Comandos Úteis

### Verificar uso de memória em tempo real
```bash
# No Linux/Mac
watch -n 1 'ps aux | grep node'

# No Windows
tasklist | findstr node
```

### Forçar garbage collection manualmente
```javascript
// No console do Node.js
global.gc();
```

### Verificar configurações do V8
```javascript
// No console do Node.js
console.log(process.memoryUsage());
console.log(process.config);
```

## Troubleshooting

### Problema: "JavaScript heap out of memory"
**Solução:** Verifique se está usando o script correto com `--max-old-space-size=8192`

### Problema: Garbage collector não funciona
**Solução:** Certifique-se de que está executando com `--expose-gc`

### Problema: Uso de memória muito alto
**Solução:** 
1. Verifique se há vazamentos de memória
2. Reduza o número de processamentos simultâneos
3. Aumente a frequência do garbage collection

## Performance

### Otimizações Implementadas

1. **Garbage Collection Estratégico**: Executado após operações de memória intensiva
2. **Monitoramento Proativo**: Detecta problemas antes que afetem o sistema
3. **Limpeza de Referências**: Remove referências desnecessárias automaticamente

### Métricas Esperadas

- **Heap Usage**: < 80% em condições normais
- **Memory Leaks**: Detectados pelo monitoramento
- **Processing Speed**: Mantida com garbage collection otimizado

## Configurações Avançadas

### Variáveis de Ambiente

```bash
# Configurar tamanho do heap via variável de ambiente
export NODE_OPTIONS="--max-old-space-size=8192 --expose-gc"

# Executar aplicação
npm start
```

### Configurações do V8

```bash
# Configurações adicionais do V8
node --max-old-space-size=8192 --expose-gc --optimize-for-size src/index.js
```

## Monitoramento em Produção

### Logs de Memória

O sistema gera logs detalhados sobre o uso de memória:
- Status a cada 30 segundos
- Alertas quando necessário
- Estatísticas de garbage collection

### Métricas Importantes

- **RSS**: Memória total alocada pelo processo
- **Heap Used**: Memória JavaScript em uso
- **External**: Memória usada por objetos C++
- **Array Buffers**: Memória para buffers binários

## Conclusão

As configurações implementadas garantem:
- Uso eficiente de memória
- Prevenção de vazamentos
- Monitoramento proativo
- Performance otimizada

Para dúvidas ou problemas, consulte os logs do sistema ou execute o script de teste de memória.
