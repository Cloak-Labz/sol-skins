import 'reflect-metadata';
import 'express-async-errors';
import { config } from './config/env';
import { initializeDatabase } from './config/database';
import { logger } from './middlewares/logger';
import { createApp } from './app';
import { cleanupExpiredNonces } from './middlewares/nonceValidation';

async function bootstrap() {
  try {
    // Validate CORS configuration on startup
    const validateCorsConfig = () => {
      if (process.env.ALLOWED_ORIGINS) {
        const origins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
        const hasWildcard = origins.some(origin => 
          origin.includes('*') || origin === '*' || origin === 'null' || origin === 'undefined'
        );
        
        if (hasWildcard) {
          logger.error('SECURITY ERROR: CORS wildcards detected in ALLOWED_ORIGINS environment variable!');
          logger.error('This is a critical security risk. Wildcards are not allowed.');
          if (config.env === 'production') {
            logger.error('Server will not start in production with wildcard CORS.');
            process.exit(1);
          } else {
            logger.warn('Wildcard detected in development mode. This will be blocked in production.');
          }
        }
        
        logger.info(`CORS configured with ${origins.length} allowed origin(s):`, origins);
      } else {
        logger.info('CORS using default allowed origins (check ALLOWED_ORIGINS env var for production)');
      }
    };
    
    validateCorsConfig();
    
    // Initialize database
    await initializeDatabase();
    logger.info('Database connected successfully');

    // Rate limiting uses in-memory storage (no Redis required)

    // Create Express app
    const app = await createApp();

    // Start server
    const port = config.port;
    const server = app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API Prefix: ${config.apiPrefix}`);
    });

    // Start periodic cleanup job for expired nonces (every 10 minutes)
    setInterval(async () => {
      try {
        const deletedCount = await cleanupExpiredNonces();
        if (deletedCount > 0) {
          logger.debug(`Cleaned up ${deletedCount} expired nonces`);
        }
      } catch (error) {
        logger.error('Error in nonce cleanup job:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
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
    logger.error('Application startup failed:', error);
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