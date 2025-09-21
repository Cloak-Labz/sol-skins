import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { OpenBoxSchema, type OpenBoxRequest } from '@phygibox/types';

const prisma = new PrismaClient();

export async function lootBoxRoutes(fastify: FastifyInstance) {
  // Get all loot boxes
  fastify.get('/', async (request, reply) => {
    const lootBoxes = await prisma.lootBox.findMany({
      include: {
        skins: {
          where: { status: 'available' },
          select: {
            id: true,
            name: true,
            rarity: true,
            priceRef: true,
          },
        },
        _count: {
          select: {
            skins: {
              where: { status: 'available' },
            },
          },
        },
      },
    });

    return { success: true, data: lootBoxes };
  });

  // Get loot box by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const lootBox = await prisma.lootBox.findUnique({
      where: { id },
      include: {
        skins: {
          where: { status: 'available' },
          select: {
            id: true,
            name: true,
            rarity: true,
            priceRef: true,
            metadata: true,
          },
        },
        _count: {
          select: {
            skins: {
              where: { status: 'available' },
            },
          },
        },
      },
    });

    if (!lootBox) {
      return reply.status(404).send({ error: 'Loot box not found' });
    }

    return { success: true, data: lootBox };
  });

  // Open loot box (register intention)
  fastify.post<{ Body: OpenBoxRequest }>('/open', {
    schema: {
      body: {
        type: 'object',
        required: ['lootBoxId', 'walletAddress'],
        properties: {
          lootBoxId: { type: 'string', minLength: 1 },
          walletAddress: { type: 'string', minLength: 1 }
        }
      }
    },
  }, async (request, reply) => {
    const { lootBoxId, walletAddress } = request.body;

    // Find or create user
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress },
    });

    // Verify loot box exists
    const lootBox = await prisma.lootBox.findUnique({
      where: { id: lootBoxId },
    });

    if (!lootBox) {
      return reply.status(404).send({ error: 'Loot box not found' });
    }

    // Create pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        lootBoxId,
        type: 'open_box',
        txSignature: '', // Will be filled when transaction is confirmed
        amount: lootBox.price,
        status: 'pending',
      },
    });

    return {
      success: true,
      data: {
        transactionId: transaction.id,
        lootBoxId,
        price: lootBox.price,
        // Frontend should sign and send transaction to Solana
        // Then call a webhook or polling endpoint to update status
      },
    };
  });
}
