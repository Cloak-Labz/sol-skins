import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from './env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SolSkins API',
      version: '1.0.0',
      description: 'CS:GO NFT Skins Loot Box Platform API on Solana',
      contact: {
        name: 'SolSkins Team',
        email: 'dev@solskins.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}${config.apiPrefix}`,
        description: 'Development server',
      },
      {
        url: `https://api.solskins.com${config.apiPrefix}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            walletAddress: { type: 'string', example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
            username: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            totalSpent: { type: 'number' },
            totalEarned: { type: 'number' },
            casesOpened: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LootBoxType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            priceSol: { type: 'number' },
            priceUsdc: { type: 'number' },
            imageUrl: { type: 'string' },
            rarity: {
              type: 'string',
              enum: ['Standard', 'Premium', 'Special', 'Limited', 'Legendary'],
            },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            chances: {
              type: 'object',
              properties: {
                common: { type: 'number' },
                uncommon: { type: 'number' },
                rare: { type: 'number' },
                epic: { type: 'number' },
                legendary: { type: 'number' },
              },
            },
          },
        },
        UserSkin: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            weapon: { type: 'string' },
            skinName: { type: 'string' },
            rarity: {
              type: 'string',
              enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
            },
            condition: {
              type: 'string',
              enum: ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'],
            },
            currentPriceUsd: { type: 'number' },
            nftMintAddress: { type: 'string' },
            imageUrl: { type: 'string' },
            openedAt: { type: 'string', format: 'date-time' },
            canSell: { type: 'boolean' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: ['open_case', 'buyback', 'payout'],
            },
            amountSol: { type: 'number', nullable: true },
            amountUsdc: { type: 'number', nullable: true },
            amountUsd: { type: 'number' },
            txHash: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'failed'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            confirmedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.ts', './controllers/*.ts'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SolSkins API Documentation',
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
} 