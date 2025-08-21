const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const { subHours } = require('date-fns');
const Logger = require('../utils/Logger');
const HashService = require('./HashService');

class ProposalService {
  constructor() {
    this.logger = new Logger();
    this.hashService = new HashService();
  }

  async findProposal(documentNumber, reservationId) {
    try {
      this.logger.info(`Buscando proposta: documentNumber=${documentNumber}, reservationId=${reservationId}`);

      // Primeiro, tentar buscar na V1 (DynamoDB com credenciais hardcoded)
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
      // Criar cliente DynamoDB com credenciais da V1 via variáveis de ambiente
      const client = new DynamoDBClient({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID_V1,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_V1,
        },
        region: process.env.AWS_REGION_V1,
      });

      const params = {
        TableName: process.env.DYNAMODB_TABLE_V1,
        IndexName: process.env.DYNAMODB_INDEX_V1,
        KeyConditionExpression: 'documentNumber = :documentNumber',
        ExpressionAttributeValues: marshall({
          ':documentNumber': documentNumber
        })
      };

      this.logger.info('documentNumber and reservationId: ', {
        documentNumber,
        reservationId
      });

      const command = new QueryCommand(params);
      const result = await client.send(command);

      const proposals = result.Items?.map((item) => unmarshall(item)) ?? [];

      this.logger.info('proposals v1: ', proposals);

      const proposalMatch = proposals.find((proposal) => proposal.contractURL?.includes(reservationId));

      if (!proposalMatch) {
        this.logger.info('Nenhuma proposta encontrada com reservationId.');
        return undefined;
      }

      this.logger.info('proposalsMatch: ', proposalMatch);

      proposalMatch.createdAt = new Date(proposalMatch.createdAt);

      return proposalMatch;

    } catch (error) {
      this.logger.error('Erro ao buscar proposta V1:', error);
      return undefined;
    }
  }

  async findByDocumentAndReservation(documentNumber, reservationId) {
    try {
      // Para V2, usar credenciais AWS diferentes da V1
      const client = new DynamoDBClient({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID_V2,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_V2,
        },
        region: process.env.AWS_REGION_V2,
      });

      const params = {
        TableName: process.env.DYNAMODB_TABLE_V2,
        IndexName: process.env.DYNAMODB_INDEX_V2,
        KeyConditionExpression: 'documentNumber = :documentNumber',
        ExpressionAttributeValues: marshall({
          ':documentNumber': documentNumber,
        })
      };

      this.logger.info('Buscando na V2:', {
        documentNumber,
        reservationId,
        tableName: process.env.DYNAMODB_TABLE_V2,
      });

      const command = new QueryCommand(params);
      const result = await client.send(command);

      const proposals = result.Items?.map((item) => unmarshall(item)) ?? [];

      this.logger.info('proposals v2: ', proposals);

      if (proposals.length === 0) {
        this.logger.info('Nenhuma proposta encontrada na V2');
        return undefined;
      }

      const proposal = proposals[0]; // Pegar a primeira proposta encontrada
      
      this.logger.info('proposal v2 encontrada: ', proposal);

      const proposalMatch = proposals.find((proposal) => proposal.contractURL?.includes(reservationId))

      if (!proposalMatch) {
        console.log('Nenhuma proposta encontrada com reservationId V2.')
        return undefined
      }

      console.log('proposalMatch V2: ', proposalMatch)

      proposalMatch.createdAt = new Date(proposalMatch.createdAt)

      return proposalMatch;
      
    } catch (error) {
      this.logger.error('Erro ao buscar proposta V2:', error);
      return undefined;
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

    const payload = {
      numeroccb: proposal.id,
      local: proposal.customer.city,
      dia: proposal.createdAt.getDate(),
      mes: meses[proposal.createdAt.getMonth()],
      ano: proposal.createdAt.getFullYear(),
      cartosHash: this.hashService.generate('cartosHash' + formattedHour),
      horaGeracao: formattedHour,
      randomHash: this.hashService.generate('randomHash' + formattedHour)
    };

    this.logger.info('Payload gerado:', payload);
    return payload;
  }
}

module.exports = ProposalService;
