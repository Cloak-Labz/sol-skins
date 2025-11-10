import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/env';
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
  validateCSRF,
} from './middlewares/security';
import { validateNonce } from './middlewares/nonceValidation';
import { sanitizeBody, sanitizeQuery } from './middlewares/validation';
import { createRoutes } from './routes';
import { setupSwagger } from './config/swagger';

export async function createApp(): Promise<Express> {
  const app = express();

  // Trust proxy (for accurate IP addresses behind load balancers)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmetConfig);
  app.use(cors(corsOptions));
  app.use(securityHeaders);

  // Compression and parsing
  app.use(compression(compressionConfig));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging and correlation
  app.use(correlationId);
  app.use(httpLogger);

  // Request processing middleware
  app.use(requestTimeout());
  app.use(apiVersioning);
  app.use(sanitizeBody);
  app.use(sanitizeQuery);

  // Rate limiting - exclude some endpoints from global limiter
  app.use((req, res, next) => {
    // Exclude health check and calculate endpoints from global rate limit
    // (they have their own rate limiting or are lightweight)
    if (req.path === '/health' || 
        req.path.includes('/buyback/calculate') ||
        req.path.includes('/boxes/active') ||
        req.path.includes('/boxes/stats')) {
      return next();
    }
    generalLimiter(req, res, next);
  });

  // CSRF protection for state-changing operations (before routes)
  app.use(config.apiPrefix, validateCSRF);
  
  // Nonce validation for replay attack prevention (after CSRF, before routes)
  app.use(config.apiPrefix, validateNonce);

  // Setup Swagger documentation
  setupSwagger(app);

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.env,
      },
    });
  });

  // API routes
  const routes = await createRoutes();
  app.use(config.apiPrefix, routes);

  // 404 handler
  app.all('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: `Route ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND',
      },
    });
  });

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  return app;
}
