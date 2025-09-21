import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { config } from './lib/config';
import { authPlugin } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { userRoutes } from './routes/users';
import { lootBoxRoutes } from './routes/lootboxes';
import { skinRoutes } from './routes/skins';
import { buybackRoutes } from './routes/buyback';
import { adminRoutes } from './routes/admin';

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Register plugins
fastify.register(helmet);
fastify.register(cors, {
  origin: config.CORS_ORIGINS,
  credentials: true,
});
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Register middleware
fastify.register(errorHandler);
fastify.register(authPlugin);

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
fastify.register(userRoutes, { prefix: '/users' });
fastify.register(lootBoxRoutes, { prefix: '/lootboxes' });
fastify.register(skinRoutes, { prefix: '/skins' });
fastify.register(buybackRoutes, { prefix: '/buyback' });

// Graceful shutdown
const gracefulShutdown = async () => {
  fastify.log.info('Shutting down gracefully...');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    await fastify.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });
    fastify.log.info(`Server listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
