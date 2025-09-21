import { FastifyInstance, FastifyError } from 'fastify';
import { Prisma } from '@prisma/client';

export async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    fastify.log.error(error);

    // Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return reply.status(409).send({
            error: 'Conflict',
            message: 'Resource already exists',
          });
        case 'P2025':
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Resource not found',
          });
        default:
          return reply.status(500).send({
            error: 'Database Error',
            message: 'An error occurred while processing your request',
          });
      }
    }

    // Validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    // Default error
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;

    return reply.status(statusCode).send({
      error: statusCode === 500 ? 'Internal Server Error' : 'Error',
      message,
    });
  });
}
