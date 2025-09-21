import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function skinRoutes(fastify: FastifyInstance) {
  // Get skin by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const skin = await prisma.skin.findUnique({
      where: { id },
      include: {
        lootBox: true,
      },
    });

    if (!skin) {
      return reply.status(404).send({ error: 'Skin not found' });
    }

    return { success: true, data: skin };
  });

  // Get market prices for multiple skins
  fastify.get<{ 
    Querystring: { ids: string };
  }>('/market/prices', async (request, reply) => {
    const { ids } = request.query;
    
    if (!ids) {
      return reply.status(400).send({ error: 'ids parameter is required' });
    }

    const skinIds = ids.split(',');
    
    // In a real implementation, this would fetch from an oracle
    // For now, we'll return mock data based on priceRef
    const skins = await prisma.skin.findMany({
      where: {
        id: { in: skinIds },
        status: 'available',
      },
      select: {
        id: true,
        priceRef: true,
      },
    });

    const prices = skins.map(skin => ({
      id: skin.id,
      price: Number(skin.priceRef) * 1_000_000, // Convert to micro-USDC
      timestamp: Date.now(),
      signature: 'mock_signature_' + skin.id, // Mock signature
      pubkey: 'mock_oracle_pubkey', // Mock oracle pubkey
    }));

    return { success: true, data: prices };
  });

  // Get skins by rarity
  fastify.get<{ 
    Querystring: { rarity?: string; status?: string; page?: string; limit?: string };
  }>('/', async (request, reply) => {
    const { rarity, status, page = '1', limit = '20' } = request.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (rarity) where.rarity = rarity;
    if (status) where.status = status;

    const [skins, total] = await Promise.all([
      prisma.skin.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          lootBox: true,
        },
      }),
      prisma.skin.count({ where }),
    ]);

    return {
      success: true,
      data: skins,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + limitNum < total,
      },
    };
  });
}
