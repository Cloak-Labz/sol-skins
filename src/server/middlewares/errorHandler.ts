import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { config } from '../config/env';
import { sanitizeObject, maskSensitiveData } from '../utils/sensitiveData';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number, code?: string) => {
  return new AppError(message, statusCode, code);
};

// Handle different types of errors
const handleDatabaseError = (error: any): AppError => {
  let message = 'Database error occurred';
  let statusCode = 500;

  // PostgreSQL specific errors
  if (error.code === '23505') {
    message = 'Duplicate entry found';
    statusCode = 409;
  } else if (error.code === '23503') {
    message = 'Referenced record not found';
    statusCode = 400;
  } else if (error.code === '23502') {
    message = 'Required field is missing';
    statusCode = 400;
  }

  return new AppError(message, statusCode, error.code);
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Token expired', 401, 'TOKEN_EXPIRED');
};

const handleValidationError = (error: any): AppError => {
  const message = error.details?.map((detail: any) => detail.message).join(', ') || 'Validation error';
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleSolanaError = (error: any): AppError => {
  const message = error.message || 'Solana blockchain error';
  return new AppError(message, 502, 'SOLANA_ERROR');
};

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
    },
  });
};

// Sanitize error messages to prevent information leakage
const sanitizeErrorMessage = (message: string): string => {
  // Use the centralized maskSensitiveData function
  let sanitized = maskSensitiveData(message);
  
  // Additional patterns specific to error messages
  const errorPatterns = [
    // File paths
    /\/home\/[^\s]+/g,
    /\/Users\/[^\s]+/g,
    /C:\\[^\s]+/gi,
    // Database connection strings
    /postgresql:\/\/[^\s]+/gi,
    /mongodb:\/\/[^\s]+/gi,
    // JWT tokens
    /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.]*/g,
    // Stack traces
    /at\s+[\w.]+ \([\w/\\-]+:\d+:\d+\)/g,
    /at\s+[\w/\\-]+:\d+:\d+/g,
    // JSON arrays that might be private keys
    /\[[\d\s,]{50,}\]/g,
  ];

  for (const pattern of errorPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Remove stack trace indicators
  sanitized = sanitized.replace(/Stack\s*:/gi, '');
  sanitized = sanitized.replace(/Error\s*:/gi, '');

  return sanitized.trim();
};

const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send sanitized message to client
  if (err.isOperational) {
    // Sanitize error message to prevent information leakage
    const sanitizedMessage = sanitizeErrorMessage(err.message);
    
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: sanitizedMessage,
        code: err.code || 'ERROR',
      },
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;

  let error = { ...err };
  error.message = err.message;

  // Log error (full details server-side only, sanitized)
  // Never log request body in production to prevent private key exposure
  const errorDetails: any = {
    error: maskSensitiveData(err.message),
    stack: err.stack ? maskSensitiveData(err.stack) : undefined,
    name: err.name,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    correlationId: (req as any).correlationId,
  };

  // Only log body in development, and sanitize it
  if (config.env === 'development' && req.body) {
    errorDetails.body = sanitizeObject(req.body);
  }

  logger.error('Error occurred:', errorDetails);

  // Handle specific error types
  if (error.name === 'QueryFailedError') error = handleDatabaseError(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (error.name === 'ValidationError') error = handleValidationError(error);
  if (error.message?.includes('Solana')) error = handleSolanaError(error);

  if (config.env === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Catch async errors
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
}); 