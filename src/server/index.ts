import 'reflect-metadata';
import 'express-async-errors';
import express from 'express';
import { config } from './config/env';
import { initializeDatabase } from './config/database';
import { logger, httpLogger, correlationId } from './middlewares/logger';
import { globalErrorHandler } from './middlewares/errorHandler';
import {
  corsOptions,
  generalLimiter,
  helmetConfig,
  compressionConfig,
  securityHeaders,
  apiVersioning,
  requestTimeout,
} from './middlewares/security';
import { sanitizeBody, sanitizeQuery } from './middlewares/validation';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createApp } from './app';

async function bootstrap() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('🗄️  Database connected successfully');

    // Create Express app
    const app = await createApp();

    // Start server
    const port = config.port;
    const server = app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📊 Environment: ${config.env}`);
      logger.info(`📡 API Prefix: ${config.apiPrefix}`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Graceful shutdown initiated...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Application startup failed:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});

// Start the application
bootstrap(); 