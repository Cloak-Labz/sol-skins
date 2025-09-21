import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CreateUserSchema, type CreateUserRequest } from '@phygibox/types';

const prisma = new PrismaClient();

export async function userRoutes(fastify: FastifyInstance) {
  // Create or get user
  fastify.post<{ Body: CreateUserRequest }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['walletAddress'],
        properties: {
          walletAddress: { type: 'string', minLength: 1 }
        }
      }
    },
  }, async (request, reply) => {
    const { walletAddress } = request.body;

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress },
    });

    return { success: true, data: user };
  });

  // Get user by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userSkins: {
          include: {
            skin: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return { success: true, data: user };
  });

  // Get user transactions
  fastify.get<{ 
    Params: { id: string };
    Querystring: { page?: string; limit?: string };
  }>('/:id/transactions', async (request, reply) => {
    const { id } = request.params;
    const page = parseInt(request.query.page || '1', 10);
    const limit = parseInt(request.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          lootBox: true,
          skin: true,
        },
      }),
      prisma.transaction.count({
        where: { userId: id },
      }),
    ]);

    return {
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
    };
  });
}
