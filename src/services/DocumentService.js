const { PDFDocument } = require('pdf-lib');
const { createReport } = require('docx-templates');
const libre = require('libreoffice-convert');
const fs = require('fs-extra');
const path = require('path');
const Logger = require('../utils/Logger');

class DocumentService {
  constructor() {
    this.logger = new Logger();
  }

  async documentFromTemplate({ data, templateFile }) {
    try {
      this.logger.info('Gerando documento do template...');
      
      // Usar docx-templates para processar o template real
      const buffer = await createReport({
        template: templateFile,
        data: {
          numeroccb: data.numeroccb,
          local: data.local,
          dia: data.dia,
          mes: data.mes,
          ano: data.ano,
          cartosHash: data.cartosHash,
          horaGeracao: data.horaGeracao,
          randomHash: data.randomHash
        },
        cmdDelimiter: ['{{', '}}'],
        processLineBreaks: true
      });
      
      return {
        success: true,
        document: buffer
      };
    } catch (error) {
      this.logger.error('Erro ao gerar documento do template:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async convertToPdf({ file }) {
    try {
      this.logger.info('Convertendo documento para PDF...');
      
      // Usar LibreOffice para converter DOCX para PDF
      return new Promise((resolve, reject) => {
        libre.convert(file, '.pdf', undefined, (err, result) => {
          if (err) {
            this.logger.error('Erro ao converter DOCX para PDF:', err);
            resolve({
              success: false,
              error: err.message
            });
          } else {
            this.logger.info('DOCX convertido para PDF com sucesso');
            resolve({
              success: true,
              file: result
            });
          }
        });
      });
    } catch (error) {
      this.logger.error('Erro ao converter para PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async mergePDFs({ firstFile, secondFile }) {
    try {
      this.logger.info('Mesclando PDFs...');
      
      const mergedPdf = await PDFDocument.create();
      
      // Adicionar primeiro PDF
      const firstPdfDoc = await PDFDocument.load(firstFile);
      const firstPages = await mergedPdf.copyPages(firstPdfDoc, firstPdfDoc.getPageIndices());
      firstPages.forEach((page) => mergedPdf.addPage(page));
      
      // Adicionar segundo PDF
      const secondPdfDoc = await PDFDocument.load(secondFile);
      const secondPages = await mergedPdf.copyPages(secondPdfDoc, secondPdfDoc.getPageIndices());
      secondPages.forEach((page) => mergedPdf.addPage(page));
      
      const mergedPdfBytes = await mergedPdf.save();
      
      return {
        success: true,
        file: Buffer.from(mergedPdfBytes)
      };
    } catch (error) {
      this.logger.error('Erro ao mesclar PDFs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  extractTextFromDocx(docxBuffer) {
    // Função simplificada para extrair texto do DOCX
    // Em produção, você pode usar uma biblioteca como mammoth.js
    return `ENDOSSO FGTS

Número CCB: [NUMERO_CCB]
Local: [LOCAL]
Data: [DATA]
Hash Cartos: [HASH_CARTOS]
Hora de Geração: [HORA_GERACAO]
Hash Aleatório: [HASH_ALEATORIO]

Este é um documento de endosso gerado automaticamente pelo sistema FGTS.
O documento contém as informações necessárias para o processamento do contrato.
`;
  }

  docxToHtml(docxBuffer) {
    // Função simplificada para converter DOCX para HTML
    // Em produção, você pode usar uma biblioteca como mammoth.js
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { font-weight: bold; margin-bottom: 20px; }
          .field { margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="header">ENDOSSO FGTS</div>
        <div class="field"><strong>Número CCB:</strong> [NUMERO_CCB]</div>
        <div class="field"><strong>Local:</strong> [LOCAL]</div>
        <div class="field"><strong>Data:</strong> [DATA]</div>
        <div class="field"><strong>Hash Cartos:</strong> [HASH_CARTOS]</div>
        <div class="field"><strong>Hora de Geração:</strong> [HORA_GERACAO]</div>
        <div class="field"><strong>Hash Aleatório:</strong> [HASH_ALEATORIO]</div>
      </body>
      </html>
    `;
  }
}

module.exports = DocumentService;
