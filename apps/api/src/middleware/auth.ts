import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';

interface JwtPayload {
  userId: string;
  role: 'admin' | 'user';
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  // JWT verification for protected routes
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      request.user = decoded;
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // Admin role check
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }
  });
}
