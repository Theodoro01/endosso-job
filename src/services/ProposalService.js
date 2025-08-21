const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const { subHours } = require('date-fns');
const Logger = require('../utils/Logger');

class ProposalService {
  constructor() {
    this.logger = new Logger();
    this.client = new DynamoDBClient({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async findProposal(documentNumber, reservationId) {
    try {
      this.logger.info(`Buscando proposta: documentNumber=${documentNumber}, reservationId=${reservationId}`);

      // Primeiro, tentar buscar na V1 (DynamoDB)
      let proposal = await this.findOneV1(documentNumber, reservationId);

      if (!proposal) {
        this.logger.info('Proposta não encontrada na V1, procurando na V2');
        proposal = await this.findByDocumentAndReservation(documentNumber, reservationId);
      }

      if (!proposal) {
        this.logger.error('Proposta não encontrada em nenhuma versão (V1 e V2)');
        throw new Error(`Proposta não encontrada para CPF: ${documentNumber} e ReservationId: ${reservationId}`);
      }

      this.logger.info('Proposta encontrada:', proposal);
      return proposal;

    } catch (error) {
      this.logger.error('Erro ao buscar proposta:', error);
      throw error;
    }
  }

  async findOneV1(documentNumber, reservationId) {
    try {
      const params = {
        TableName: 'FgtsProposals',
        IndexName: 'documentNumberCreatedAtIndex',
        KeyConditionExpression: 'documentNumber = :documentNumber',
        ExpressionAttributeValues: marshall({
          ':documentNumber': documentNumber
        })
      };

      this.logger.info('Buscando na V1:', { documentNumber, reservationId });

      const command = new QueryCommand(params);
      const result = await this.client.send(command);

      const proposals = result.Items?.map((item) => unmarshall(item)) ?? [];

      this.logger.info('Propostas encontradas na V1:', proposals.length);

      const proposalMatch = proposals.find((proposal) => 
        proposal.contractURL?.includes(reservationId)
      );

      if (!proposalMatch) {
        this.logger.info('Nenhuma proposta encontrada com reservationId');
        return null;
      }

      this.logger.info('Proposta encontrada na V1:', proposalMatch);

      // Converter createdAt para Date se for string
      if (typeof proposalMatch.createdAt === 'string') {
        proposalMatch.createdAt = new Date(proposalMatch.createdAt);
      }

      return proposalMatch;

    } catch (error) {
      this.logger.error('Erro ao buscar na V1:', error);
      return null;
    }
  }

  async findByDocumentAndReservation(documentNumber, reservationId) {
    try {
      this.logger.info(`Buscando na V2: documentNumber=${documentNumber}, reservationId=${reservationId}`);

      // Buscar na V2 - usando uma query diferente no DynamoDB
      const params = {
        TableName: 'FgtsProposalsV2', // Tabela V2
        IndexName: 'documentNumberReservationIdIndex', // Índice específico da V2
        KeyConditionExpression: 'documentNumber = :documentNumber AND reservationId = :reservationId',
        ExpressionAttributeValues: marshall({
          ':documentNumber': documentNumber,
          ':reservationId': reservationId
        })
      };

      const command = new QueryCommand(params);
      const result = await this.client.send(command);

      const proposals = result.Items?.map((item) => unmarshall(item)) ?? [];

      this.logger.info(`Propostas encontradas na V2: ${proposals.length}`);

      if (proposals.length === 0) {
        this.logger.info('Nenhuma proposta encontrada na V2');
        return null;
      }

      const proposal = proposals[0]; // Pegar a primeira proposta encontrada

      this.logger.info('Proposta encontrada na V2:', proposal);

      // Converter createdAt para Date se for string
      if (typeof proposal.createdAt === 'string') {
        proposal.createdAt = new Date(proposal.createdAt);
      }

      return proposal;

    } catch (error) {
      this.logger.error('Erro ao buscar na V2:', error);
      throw error;
    }
  }



  generatePayload(proposal) {
    const currentDate = new Date();
    const subDate = subHours(currentDate, 3);
    
    const formattedHour = `${subDate.getUTCDate().toString().padStart(2, '0')}/${(subDate.getUTCMonth() + 1)
      .toString()
      .padStart(2, '0')}/${subDate.getUTCFullYear().toString().padStart(4, '0')} ${subDate
      .getUTCHours()
      .toString()
      .padStart(2, '0')}:${subDate.getUTCMinutes().toString().padStart(2, '0')}:${subDate
      .getUTCSeconds()
      .toString()
      .padStart(2, '0')}`;

    // Formatar mês por extenso em português
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    return {
      numeroccb: proposal.id,
      local: proposal.customer.city,
      dia: proposal.createdAt.getDate(),
      mes: meses[proposal.createdAt.getMonth()],
      ano: proposal.createdAt.getFullYear(),
      cartosHash: this.generateHash('cartosHash' + formattedHour),
      horaGeracao: formattedHour,
      randomHash: this.generateHash('randomHash' + formattedHour)
    };
  }

  generateHash(input) {
    const HashService = require('./HashService');
    const hashService = new HashService();
    return hashService.generate(input);
  }
}

module.exports = ProposalService;
