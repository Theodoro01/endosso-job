const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');
const Logger = require('../utils/Logger');
const DocumentService = require('./DocumentService');
const HashService = require('./HashService');
const ProposalService = require('./ProposalService');

class DocumentProcessor {
  constructor() {
    this.logger = new Logger();
    this.documentService = new DocumentService();
    this.hashService = new HashService();
    this.proposalService = new ProposalService();
  }

  async processDocument(filePath) {
    try {
      this.logger.info(`Iniciando processamento do arquivo: ${path.basename(filePath)}`);

      // Ler o arquivo PDF
      const pdfBuffer = await fs.readFile(filePath);
      
      // Carregar o template
      const templatePath = path.join(config.templatesFolder, config.templateFileName);
      
      if (!await fs.pathExists(templatePath)) {
        throw new Error(`Template não encontrado: ${templatePath}`);
      }

      const templateBuffer = await fs.readFile(templatePath);

      // Extrair informações do nome do arquivo (assumindo formato: CPF_Contrato_Assinado_ReservationId.pdf)
      const fileName = path.basename(filePath, '.pdf');
      const fileInfo = this.extractFileInfo(fileName);

      // Buscar informações da proposta no banco de dados
      this.logger.info('Buscando informações da proposta no banco...');
      const proposal = await this.proposalService.findProposal(fileInfo.cpf, fileInfo.reservationId);

      if (!proposal) {
        throw new Error(`Proposta não encontrada para CPF: ${fileInfo.cpf} e ReservationId: ${fileInfo.reservationId}`);
      }

      // Gerar dados para o endosso usando informações do banco
      const payload = this.proposalService.generatePayload(proposal);

      // Gerar documento do template
      this.logger.info('Gerando documento do template...');
      const endossoBuffer = await this.documentService.documentFromTemplate({
        data: payload,
        templateFile: templateBuffer
      });

      if (!endossoBuffer.success) {
        throw new Error(`Erro ao gerar documento do template: ${endossoBuffer.error}`);
      }

      // Converter para PDF
      this.logger.info('Convertendo documento para PDF...');
      const attachmentPdf = await this.documentService.convertToPdf({
        file: endossoBuffer.document
      });

      if (!attachmentPdf.success) {
        throw new Error(`Erro ao converter para PDF: ${attachmentPdf.error}`);
      }

      // Mesclar PDFs
      this.logger.info('Mesclando PDFs...');
      const finalPdf = await this.documentService.mergePDFs({
        firstFile: pdfBuffer,
        secondFile: attachmentPdf.file
      });

      if (!finalPdf.success) {
        throw new Error(`Erro ao mesclar PDFs: ${finalPdf.error}`);
      }

      // Salvar arquivo processado com o mesmo nome do original
      const outputFileName = path.basename(filePath);
      const outputPath = path.join(config.outputFolder, outputFileName);
      
      await fs.writeFile(outputPath, finalPdf.file);
      
      this.logger.info(`Documento processado com sucesso: ${outputFileName}`);

      return {
        success: true,
        outputPath: outputPath,
        fileName: outputFileName
      };

    } catch (error) {
      this.logger.error('Erro no processamento:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  extractFileInfo(fileName) {
    // Suporta formatos: CPF_Contrato_Assinado_ReservationId ou CPF_Contrato Assinado_ReservationId
    const parts = fileName.split('_');
    
    if (parts.length < 3) {
      throw new Error(`Formato de arquivo inválido: ${fileName}. Esperado: CPF_Contrato_Assinado_ReservationId`);
    }

    // Verificar se é "Contrato_Assinado" ou "Contrato Assinado"
    const hasContratoAssinado = parts.some(part => 
      part === 'Contrato' || part === 'Assinado' || part.includes('Contrato') || part.includes('Assinado')
    );

    if (!hasContratoAssinado) {
      throw new Error(`Formato de arquivo inválido: ${fileName}. Deve conter 'Contrato' e 'Assinado'`);
    }

    // Pegar o último elemento como ReservationId
    const reservationId = parts[parts.length - 1];
    const cpf = parts[0];

    return {
      cpf: cpf,
      reservationId: reservationId,
      // Dados mockados para simular a proposta
      customer: {
        city: 'São Paulo',
        cpf: cpf
      },
      id: reservationId,
      createdAt: new Date()
    };
  }


}

module.exports = DocumentProcessor;
