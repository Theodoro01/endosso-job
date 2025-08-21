# Pasta de Templates

Coloque aqui o arquivo de template DOCX que será usado para gerar os endossos.

## Arquivo Necessário

Nome do arquivo: `4fad41b1671a1b2b5983c194ac4007b1-334acd01dd232b74d2.docx`

## Estrutura do Template

O template deve conter as seguintes variáveis que serão substituídas:

- `{{numeroccb}}` - Número CCB
- `{{local}}` - Local (cidade)
- `{{dia}}` - Dia
- `{{mes}}` - Mês por extenso
- `{{ano}}` - Ano
- `{{cartosHash}}` - Hash Cartos
- `{{horaGeracao}}` - Hora de geração
- `{{randomHash}}` - Hash aleatório

## Exemplo de Template

```
ENDOSSO FGTS

Número CCB: {{numeroccb}}
Local: {{local}}
Data: {{dia}} de {{mes}} de {{ano}}

Hash Cartos: {{cartosHash}}
Hora de Geração: {{horaGeracao}}
Hash Aleatório: {{randomHash}}

[Conteúdo do endosso...]
```

## Como Obter o Template

1. Copie o arquivo do seu projeto original
2. Renomeie para o nome especificado acima
3. Coloque nesta pasta
