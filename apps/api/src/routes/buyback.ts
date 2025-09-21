import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { BuybackSchema, type BuybackRequest, type BuybackQuote } from '@phygibox/types';

const prisma = new PrismaClient();

export async function buybackRoutes(fastify: FastifyInstance) {
  // Get buyback quote
  fastify.get<{ 
    Querystring: { skinId: string; walletAddress: string };
  }>('/quote', async (request, reply) => {
    const { skinId, walletAddress } = request.query;

    if (!skinId || !walletAddress) {
      return reply.status(400).send({ 
        error: 'skinId and walletAddress are required' 
      });
    }

    // Find user and skin
    const [user, skin] = await Promise.all([
      prisma.user.findUnique({ where: { walletAddress } }),
      prisma.skin.findUnique({ where: { id: skinId } }),
    ]);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (!skin) {
      return reply.status(404).send({ error: 'Skin not found' });
    }

    // Check if user owns this skin
    const userSkin = await prisma.userSkin.findFirst({
      where: {
        userId: user.id,
        skinId: skin.id,
        status: 'owned',
      },
    });

    if (!userSkin) {
      return reply.status(404).send({ error: 'Skin not owned by user' });
    }

    // Get oracle price (mock implementation)
    const oraclePrice = Number(skin.priceRef) * 1_000_000; // Convert to micro-USDC
    const fee = Math.floor(oraclePrice * 0.02); // 2% fee
    const spread = Math.floor(oraclePrice * 0.01); // 1% spread
    const effectivePrice = oraclePrice - fee - spread;

    const quote: BuybackQuote = {
      skinId: skin.id,
      oraclePrice,
      fee,
      spread,
      effectivePrice,
      canBuyback: effectivePrice > 0,
    };

    return { success: true, data: quote };
  });

  // Execute buyback
  fastify.post<{ Body: BuybackRequest }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['skinId', 'walletAddress', 'minAcceptablePrice'],
        properties: {
          skinId: { type: 'string', minLength: 1 },
          walletAddress: { type: 'string', minLength: 1 },
          minAcceptablePrice: { type: 'number', minimum: 0 }
        }
      }
    },
  }, async (request, reply) => {
    const { skinId, walletAddress, minAcceptable } = request.body;

    // Find user and skin
    const [user, skin] = await Promise.all([
      prisma.user.findUnique({ where: { walletAddress } }),
      prisma.skin.findUnique({ where: { id: skinId } }),
    ]);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (!skin) {
      return reply.status(404).send({ error: 'Skin not found' });
    }

    // Check if user owns this skin
    const userSkin = await prisma.userSkin.findFirst({
      where: {
        userId: user.id,
        skinId: skin.id,
        status: 'owned',
      },
    });

    if (!userSkin) {
      return reply.status(404).send({ error: 'Skin not owned by user' });
    }

    // Calculate buyback price
    const oraclePrice = Number(skin.priceRef) * 1_000_000;
    const fee = Math.floor(oraclePrice * 0.02);
    const spread = Math.floor(oraclePrice * 0.01);
    const effectivePrice = oraclePrice - fee - spread;

    if (effectivePrice < minAcceptable) {
      return reply.status(400).send({ 
        error: 'Effective price too low',
        data: { effectivePrice, minAcceptable }
      });
    }

    // Create buyback transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        lootBoxId: skin.lootBoxId,
        skinId: skin.id,
        type: 'buyback',
        txSignature: '', // Will be filled when transaction is confirmed
        amount: effectivePrice,
        status: 'pending',
      },
    });

    return {
      success: true,
      data: {
        transactionId: transaction.id,
        skinId,
        effectivePrice,
        // Frontend should sign and send transaction to Solana
        // Then call a webhook or polling endpoint to update status
      },
    };
  });
}
