import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { RequestNonce } from '../entities/RequestNonce';
import { AppError } from './errorHandler';
import { logger } from './logger';
import { AuditService } from '../services/AuditService';
import { AuditEventType } from '../entities/AuditLog';

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes tolerance

/**
 * Middleware to validate request nonces and prevent replay attacks
 * 
 * Requirements:
 * - Nonce must be present in request body
 * - Nonce must not have been used before
 * - Timestamp must be within acceptable range (not too old)
 * - Timestamp must not be too far in the future
 */
export async function validateNonce(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip nonce validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip nonce validation for public/initial endpoints
  const publicPaths = [
    '/health',
    '/csrf-token',
    '/auth/connect', // Initial wallet connection doesn't need nonce (wallet signature provides security)
    '/buyback/calculate',
    '/boxes/active',
    '/boxes/stats'
  ];
  if (publicPaths.some(path => req.path.includes(path))) {
    return next();
  }

  try {
    const { nonce, timestamp } = req.body;

    // Check if nonce is provided
    if (!nonce) {
      logger.warn('Request nonce missing', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
      });

      // Audit log missing nonce
      const auditService = new AuditService();
      auditService.logSecurity(AuditEventType.SECURITY_NONCE_MISSING, {
        walletAddress: (req as any).user?.walletAddress,
        userId: (req as any).user?.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestPath: req.path,
        httpMethod: req.method,
        description: 'Request nonce missing',
      }).catch(err => logger.error('Failed to log audit event:', err));

      return next(new AppError('Request nonce is required', 400, 'NONCE_REQUIRED'));
    }

    // Validate nonce format (should be a string, reasonable length)
    if (typeof nonce !== 'string' || nonce.length < 8 || nonce.length > 255) {
      logger.warn('Invalid nonce format', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        nonceLength: nonce?.length,
      });

      return next(new AppError('Invalid nonce format', 400, 'INVALID_NONCE_FORMAT'));
    }

    // Validate timestamp if provided
    const now = Date.now();
    if (timestamp) {
      const timestampNum = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
      
      if (isNaN(timestampNum)) {
        return next(new AppError('Invalid timestamp format', 400, 'INVALID_TIMESTAMP'));
      }

      // Check if timestamp is too old (more than 5 minutes)
      if (timestampNum < now - MAX_TIMESTAMP_DRIFT_MS) {
        logger.warn('Request timestamp too old', {
          ip: req.ip,
          timestamp: timestampNum,
          now,
          diff: now - timestampNum,
        });

        return next(new AppError('Request timestamp is too old. Please make a new request.', 400, 'TIMESTAMP_TOO_OLD'));
      }

      // Check if timestamp is too far in the future (more than 1 minute)
      if (timestampNum > now + 60 * 1000) {
        logger.warn('Request timestamp too far in future', {
          ip: req.ip,
          timestamp: timestampNum,
          now,
          diff: timestampNum - now,
        });

        return next(new AppError('Request timestamp is invalid (too far in future)', 400, 'TIMESTAMP_INVALID'));
      }
    }

    // Check if nonce has been used before
    const nonceRepository = AppDataSource.getRepository(RequestNonce);
    const existingNonce = await nonceRepository.findOne({
      where: { nonce },
    });

    if (existingNonce) {
      logger.warn('Duplicate nonce detected (replay attack attempt)', {
        ip: req.ip,
        nonce: nonce.substring(0, 8) + '...',
        method: req.method,
        path: req.path,
        originalNonceCreatedAt: existingNonce.createdAt,
        userAgent: req.get('User-Agent'),
      });

      // Audit log replay attack attempt
      const auditService = new AuditService();
      auditService.logSecurity(AuditEventType.SECURITY_REPLAY_ATTEMPT, {
        walletAddress: (req as any).user?.walletAddress,
        userId: (req as any).user?.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestPath: req.path,
        httpMethod: req.method,
        description: `Duplicate nonce detected: ${nonce.substring(0, 8)}...`,
      }).catch(err => logger.error('Failed to log audit event:', err));

      return next(new AppError('Request nonce has already been used (replay attack detected)', 400, 'NONCE_REUSED'));
    }

    // Store nonce in database (before processing request to prevent race conditions)
    const newNonce = nonceRepository.create({
      nonce,
      ipAddress: req.ip,
      walletAddress: (req as any).user?.walletAddress || null,
      endpoint: req.path,
      timestamp: timestamp || now,
    });

    try {
      await nonceRepository.save(newNonce);
    } catch (saveError: any) {
      // If save fails due to unique constraint (race condition), check if it's a duplicate
      if (saveError.code === '23505' || saveError.message?.includes('duplicate')) {
        logger.warn('Nonce collision detected (race condition)', {
          nonce: nonce.substring(0, 8) + '...',
          ip: req.ip,
        });
        
        // Audit log replay attempt
        const auditService = new AuditService();
        auditService.logSecurity(AuditEventType.SECURITY_REPLAY_ATTEMPT, {
          walletAddress: (req as any).user?.walletAddress,
          userId: (req as any).user?.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestPath: req.path,
          httpMethod: req.method,
          description: `Nonce collision detected: ${nonce.substring(0, 8)}...`,
        }).catch(err => logger.error('Failed to log audit event:', err));
        
        return next(new AppError('Request nonce has already been used (replay attack detected)', 400, 'NONCE_REUSED'));
      }
      throw saveError;
    }

    // Continue to next middleware
    next();
  } catch (error: any) {
    logger.error('Nonce validation error:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });
    
    // On error, fail closed (reject request)
    // But check if it's a database connection issue
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Connection')) {
      logger.error('Database connection error during nonce validation');
      return next(new AppError('Service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE'));
    }
    
    return next(new AppError('Nonce validation failed', 500, 'NONCE_VALIDATION_ERROR'));
  }
}

/**
 * Cleanup job to remove expired nonces
 * Should be called periodically (e.g., every 10 minutes)
 */
export async function cleanupExpiredNonces(): Promise<number> {
  try {
    const nonceRepository = AppDataSource.getRepository(RequestNonce);
    const expiryTime = new Date(Date.now() - NONCE_EXPIRY_MS);

    const result = await nonceRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :expiryTime', { expiryTime })
      .execute();

    const deletedCount = result.affected || 0;

    if (deletedCount > 0) {
      logger.debug(`Cleaned up ${deletedCount} expired nonces`);
    }

    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up expired nonces:', error);
    return 0;
  }
}

