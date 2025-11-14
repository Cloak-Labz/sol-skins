import winston from 'winston';
import morgan from 'morgan';
import { Request, Response } from 'express';
import { config } from '../config/env';
import { sanitizeObject } from '../utils/sensitiveData';

// Winston logger configuration
// In test environment, use silent logger to avoid cluttering test output
const isTest = config.env === 'test';

export const logger = winston.createLogger({
  level: isTest ? 'error' : config.logging.level, // Only log errors in test
  silent: isTest, // Completely silent in test (can be overridden if needed)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const logMessage = stack || message;
      // Sanitize metadata to prevent sensitive data exposure
      const sanitizedMeta = sanitizeObject(meta);
      return JSON.stringify({
        timestamp,
        level,
        message: logMessage,
        ...sanitizedMeta,
      });
    })
  ),
  defaultMeta: { service: 'dust3-api' },
  transports: isTest ? [] : [ // No file transports in test
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development (not in test)
if (config.env === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level}]: ${stack || message}`;
      })
    ),
  }));
}

// Morgan middleware for HTTP request logging
export const httpLogger = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
  {
    stream: {
      write: (message: string) => {
        logger.info(message.trim(), { type: 'http' });
      },
    },
  }
);

// Request correlation ID middleware
export const correlationId = (req: Request, res: Response, next: Function) => {
  const correlationId = req.headers['x-correlation-id'] as string || 
                        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  logger.defaultMeta = { 
    ...logger.defaultMeta, 
    correlationId 
  };
  
  next();
};

// Export types
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
} 