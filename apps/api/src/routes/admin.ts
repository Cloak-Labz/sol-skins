import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const BulkUploadSchema = z.object({
  skins: z.array(z.object({
    name: z.string(),
    rarity: z.enum(['common', 'rare', 'epic', 'legendary', 'mythic']),
    marketCategory: z.string(),
    metadata: z.record(z.any()),
    priceRef: z.number().positive(),
    lootBoxId: z.string(),
    inventoryRef: z.string(),
  })),
});

const UpdateSkinStatusSchema = z.object({
  status: z.enum(['available', 'reserved', 'assigned', 'returned', 'burned', 'back_to_pool']),
});

const CreateSnapshotSchema = z.object({
  operatorSig: z.string(),
});

const PublishPriceSchema = z.object({
  inventoryId: z.string(),
  price: z.number().positive(),
  timestamp: z.number(),
  signature: z.string(),
  pubkey: z.string(),
});

export async function adminRoutes(fastify: FastifyInstance) {
  // Apply admin authentication to all routes
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const jwt = require('jsonwebtoken');
      const { config } = require('../lib/config');
      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      if (!decoded || decoded.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // Bulk upload skins
  fastify.post<{ Body: z.infer<typeof BulkUploadSchema> }>('/inventory/skins', {
    schema: {
      body: BulkUploadSchema,
    },
  }, async (request, reply) => {
    const { skins } = request.body;

    const createdSkins = await prisma.skin.createMany({
      data: skins.map(skin => ({
        ...skin,
        status: 'available',
      })),
      skipDuplicates: true,
    });

    return { 
      success: true, 
      data: { 
        count: createdSkins.count,
        message: `Created ${createdSkins.count} skins`
      }
    };
  });

  // Update skin status
  fastify.patch<{ 
    Params: { id: string };
    Body: z.infer<typeof UpdateSkinStatusSchema>;
  }>('/inventory/skins/:id/status', {
    schema: {
      body: UpdateSkinStatusSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;

    const skin = await prisma.skin.update({
      where: { id },
      data: { status },
    });

    return { success: true, data: skin };
  });

  // Create merkle snapshot
  fastify.post<{ Body: z.infer<typeof CreateSnapshotSchema> }>('/snapshots', {
    schema: {
      body: CreateSnapshotSchema,
    },
  }, async (request, reply) => {
    const { operatorSig } = request.body;

    // Get all available skins
    const availableSkins = await prisma.skin.findMany({
      where: { status: 'available' },
      select: { id: true, inventoryRef: true },
    });

    // In a real implementation, generate Merkle tree here
    // For now, create a mock root
    const merkleRoot = 'mock_merkle_root_' + Date.now();

    const snapshot = await prisma.merkleSnapshot.create({
      data: {
        merkleRoot,
        operatorSig,
        totalItems: availableSkins.length,
      },
    });

    return { 
      success: true, 
      data: {
        snapshotId: snapshot.id,
        merkleRoot,
        totalItems: availableSkins.length,
        // In real implementation, publish to Anchor program
      }
    };
  });

  // Publish oracle price
  fastify.post<{ Body: z.infer<typeof PublishPriceSchema> }>('/oracle/price-publish', {
    schema: {
      body: PublishPriceSchema,
    },
  }, async (request, reply) => {
    const { inventoryId, price, timestamp, signature, pubkey } = request.body;

    // In a real implementation, verify signature and store price
    // For now, just return success
    return { 
      success: true, 
      data: { 
        message: 'Price published successfully',
        inventoryId,
        price,
      }
    };
  });

  // Get treasury status
  fastify.get('/treasury/status', async (request, reply) => {
    const [deposits, withdrawals, buybacks, fees] = await Promise.all([
      prisma.treasuryLedger.aggregate({
        where: { txType: 'deposit' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.treasuryLedger.aggregate({
        where: { txType: 'withdraw' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.treasuryLedger.aggregate({
        where: { txType: 'buyback' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.treasuryLedger.aggregate({
        where: { txType: 'fee' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalDeposits = Number(deposits._sum.amount || 0);
    const totalWithdrawals = Number(withdrawals._sum.amount || 0);
    const totalBuybacks = Number(buybacks._sum.amount || 0);
    const totalFees = Number(fees._sum.amount || 0);
    const currentBalance = totalDeposits - totalWithdrawals - totalBuybacks - totalFees;

    return {
      success: true,
      data: {
        currentBalance,
        totalDeposits,
        totalWithdrawals,
        totalBuybacks,
        totalFees,
        transactionCounts: {
          deposits: deposits._count.id,
          withdrawals: withdrawals._count.id,
          buybacks: buybacks._count.id,
          fees: fees._count.id,
        },
      },
    };
  });

  // Get all skins with filters
  fastify.get<{
    Querystring: {
      status?: string;
      rarity?: string;
      page?: string;
      limit?: string;
    };
  }>('/inventory/skins', async (request, reply) => {
    const { status, rarity, page = '1', limit = '50' } = request.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (rarity) where.rarity = rarity;

    const [skins, total] = await Promise.all([
      prisma.skin.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          lootBox: true,
          _count: {
            select: {
              userSkins: true,
            },
          },
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
