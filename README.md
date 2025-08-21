# Sistema de Processamento FGTS

Sistema simples para monitorar uma pasta, processar documentos PDF e gerar endossos automaticamente.

## Funcionalidades

- 🔍 Monitoramento automático de pasta de entrada
- 🗄️ Busca de informações no banco de dados DynamoDB
- 📄 Processamento de documentos PDF
- 📝 Geração de endossos usando templates DOCX reais
- 🔄 Conversão DOCX para PDF usando LibreOffice
- 🔄 Mesclagem de PDFs
- 📁 Movimentação automática de arquivos processados
- 🚨 Tratamento de erros e logs detalhados
- 🔄 Fallback para dados mockados quando não encontra no banco

## Instalação

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd endosso-job-fgts
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente copiando o arquivo de exemplo:
```bash
cp config.example .env
```

4. Edite o arquivo `.env` com suas configurações:
```bash
# Configurações das pastas
INPUT_FOLDER=/caminho/para/pasta/entrada
OUTPUT_FOLDER=/caminho/para/pasta/saida
TEMPLATES_FOLDER=/caminho/para/pasta/templates

# Configurações AWS (DynamoDB)
AWS_ACCESS_KEY_ID=sua_access_key_aqui
AWS_SECRET_ACCESS_KEY=sua_secret_key_aqui
AWS_REGION=us-east-1
```

## Configuração

### Pastas Necessárias

1. **Pasta de Entrada**: Onde os documentos PDF serão depositados
2. **Pasta de Saída**: Onde os documentos processados serão salvos
3. **Pasta de Templates**: Onde o arquivo de template DOCX está localizado

### Formato dos Arquivos

Os arquivos PDF devem seguir o formato:
```
CPF_Contrato_Assinado_ReservationId.pdf
```

Exemplo: `12345678901_Contrato_Assinado_ABC123.pdf`

### Template

Coloque o arquivo de template DOCX na pasta de templates com o nome:
```
4fad41b1671a1b2b5983c194ac4007b1-334acd01dd232b74d2.docx
```

### Configuração do Banco de Dados

O sistema busca informações das propostas no DynamoDB. Configure as credenciais AWS:

```bash
export AWS_ACCESS_KEY_ID="sua_access_key"
export AWS_SECRET_ACCESS_KEY="sua_secret_key"
export AWS_REGION="us-east-1"
```

Ou use o arquivo `config.example` como base para suas configurações.

**Nota**: Se não encontrar a proposta no banco, o sistema usa dados mockados para continuar o processamento.

## Uso

### Desenvolvimento Local

```bash
npm start
```

### Modo Desenvolvimento

```bash
npm run dev
```

### 🖥️ Deploy em Servidor On-Premises

Para configurar em um servidor corporativo com pastas compartilhadas:

#### Deploy Rápido (5 minutos)
```bash
# 1. Baixar o projeto no servidor
git clone <seu-repositorio> /tmp/fgts-system
cd /tmp/fgts-system

# 2. Executar instalação automática
sudo ./scripts/install-on-premises.sh

# 3. Configurar aplicação
sudo cp -r * /srv/fgts-system/app/
sudo nano /srv/fgts-system/app/.env

# 4. Deploy
sudo /srv/fgts-system/deploy.sh
```

#### Documentação Completa
- 📋 [Guia Rápido](docs/quick-deploy.md) - Deploy em 5 minutos
- 📖 [Configuração Completa](docs/setup-on-premises.md) - Guia detalhado
- 🔧 [Script de Instalação](scripts/install-on-premises.sh) - Instalação automatizada

## Como Funciona

1. O sistema monitora continuamente a pasta de entrada
2. Quando um novo arquivo PDF é detectado:
   - Extrai informações do nome do arquivo (CPF, ReservationId)
   - **Busca informações da proposta no DynamoDB (V1)**
   - **Se não encontrar, usa dados mockados (V2)**
   - Gera dados para o endosso usando informações do banco
   - Cria um documento DOCX usando o template real
   - **Converte o DOCX para PDF usando LibreOffice**
   - Mescla o PDF original com o endosso
   - Salva o arquivo processado na pasta de saída
   - Remove o arquivo original da pasta de entrada

## Estrutura do Projeto

```
Endosso-job-FGTS/
├── src/
│   ├── index.js                 # Ponto de entrada da aplicação
│   ├── config/
│   │   └── config.js            # Configurações centralizadas
│   ├── services/
│   │   ├── FolderWatcher.js     # Monitoramento de pastas
│   │   ├── DocumentProcessor.js # Processamento de documentos
│   │   ├── DocumentService.js   # Operações com documentos
│   │   ├── ProposalService.js   # Integração com banco de dados
│   │   ├── QueueProcessor.js    # Processamento em fila
│   │   └── HashService.js       # Geração de hashes
│   └── utils/
│       └── Logger.js            # Sistema de logs
├── templates/
│   └── 4fad41b1671a1b2b5983c194ac4007b1-334acd01dd232b74d2.docx
├── scripts/
│   ├── install-on-premises.sh   # Instalação automatizada
│   ├── deploy-custom.sh         # Deploy personalizado
│   └── monitor-performance.js   # Monitoramento de performance
├── docs/
│   ├── setup-on-premises.md     # Guia de configuração
│   └── quick-deploy.md          # Deploy rápido
├── config/
│   └── ultra-performance.env    # Configuração de alta performance
├── .env                         # Variáveis de ambiente
├── package.json                 # Dependências e scripts
└── README.md                    # Este arquivo
```

## Logs

O sistema gera logs detalhados de todas as operações:
- Arquivos detectados
- Processamento iniciado/concluído
- Erros encontrados
- Movimentação de arquivos

## Tratamento de Erros

- Arquivos com formato inválido são ignorados
- Arquivos muito grandes são rejeitados
- Erros de processamento movem o arquivo para pasta de erros
- Sistema de retry para operações que falham

## Variáveis de Ambiente

- `INPUT_FOLDER`: Pasta de entrada (padrão: Desktop/input-documents)
- `OUTPUT_FOLDER`: Pasta de saída (padrão: Desktop/processed-documents)
- `TEMPLATES_FOLDER`: Pasta de templates (padrão: Desktop/templates)
- `LOG_LEVEL`: Nível de log (error, warn, info, debug)

## Dependências

- `chokidar`: Monitoramento de pastas
- `docx-templates`: Geração de documentos DOCX
- `pdf-lib`: Manipulação de PDFs
- `libreoffice-convert`: Conversão DOCX para PDF
- `fs-extra`: Operações de arquivo avançadas
- `@aws-sdk/client-dynamodb`: Integração com AWS DynamoDB
- `date-fns`: Manipulação de datas
- `dotenv`: Gerenciamento de variáveis de ambiente

## Suporte

Para dúvidas ou problemas, consulte os logs do sistema ou entre em contato com a equipe de desenvolvimento.
