import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { config } from '../config/env';

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

const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);

    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong!',
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

  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    correlationId: req.correlationId,
  });

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