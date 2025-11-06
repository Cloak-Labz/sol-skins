import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { AppError } from './errorHandler';
import { logger } from './logger';
import { UserService } from '../services/UserService';
import { AuditService } from '../services/AuditService';
import { AuditEventType } from '../entities/AuditLog';
import { accountLockoutService } from '../services/AccountLockoutService';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        walletAddress: string;
      };
    }
  }
}

export class WalletAuthMiddleware {
  private userService: UserService;
  private auditService: AuditService;

  constructor(userService: UserService) {
    this.userService = userService;
    this.auditService = new AuditService();
  }

  // Verify Solana wallet signature
  // Note: nacl.sign.detached.verify already uses constant-time comparison internally
  // We add random delay to mask any remaining timing differences
  public verifyWalletSignature = async (
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> => {
    try {
      // Log signature verification attempt (without sensitive data)
      const firstCharCode = message.length > 0 ? message.charCodeAt(0) : -1;
      logger.debug('Verifying wallet signature', {
        messageLength: message.length,
        signatureLength: signature.length,
        publicKeyLength: publicKey.length,
        hasPrefix: message.startsWith('solana off-chain') || firstCharCode === 0xFF,
      });
      
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = new PublicKey(publicKey).toBytes();

      // Try multiple verification strategies
      // Different wallet adapters handle the prefix differently
      const verificationStrategies = [
        {
          name: 'message as-is',
          getMessageBytes: () => new TextEncoder().encode(message),
        },
        {
          name: 'with prefix \\xFFsolana off-chain',
          getMessageBytes: () => {
            const PREFIX = '\xFFsolana off-chain';
            return new TextEncoder().encode(PREFIX + message);
          },
        },
        {
          name: 'with prefix solana off-chain (no \\xFF)',
          getMessageBytes: () => {
            const PREFIX = 'solana off-chain';
            return new TextEncoder().encode(PREFIX + message);
          },
        },
      ];
      
      // If message already has prefix, try without it
      if (message.startsWith('\xFFsolana off-chain') || message.startsWith('solana off-chain')) {
        verificationStrategies.push({
          name: 'without prefix',
          getMessageBytes: () => {
            const messageWithoutPrefix = message.replace(/^[\xFF]?solana off-chain/, '');
            return new TextEncoder().encode(messageWithoutPrefix);
          },
        });
      }
      
      let isValid = false;
      let successfulStrategy = null;
      let messageBytes: Uint8Array | null = null;
      
      for (const strategy of verificationStrategies) {
        try {
          messageBytes = strategy.getMessageBytes();
          isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
          );
          
          if (isValid) {
            successfulStrategy = strategy.name;
            logger.debug('Signature verified successfully', {
              strategy: strategy.name,
              messageLength: messageBytes.length,
            });
            break;
          }
        } catch (error) {
          logger.debug(`❌ Strategy "${strategy.name}" error:`, error);
        }
      }
      
      if (!isValid) {
        logger.warn('All signature verification strategies failed', {
          strategies: verificationStrategies.map(s => s.name),
          messageLength: message.length,
          signatureLength: signatureBytes.length,
        });
      }
      
      logger.debug('Signature verification result', {
        isValid,
        successfulStrategy,
        messageLength: messageBytes?.length || 0,
        signatureLength: signatureBytes.length,
      });

      // Add random delay to mask timing differences (even though nacl is constant-time)
      const { randomDelay } = require('../utils/timingAttackProtection');
      await randomDelay(10, 30); // 10-30ms delay

      return isValid;
    } catch (error) {
      logger.error('Wallet signature verification failed:', error);
      
      // Add delay even on error to prevent timing leaks
      const { randomDelay } = require('../utils/timingAttackProtection');
      await randomDelay(10, 30);
      
      return false;
    }
  };

  // Middleware to protect routes with wallet authentication (signature optional for GET requests)
  public requireWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // For GET requests, check query params; for POST/PUT, check body
      const walletAddress = req.body.walletAddress || req.query.walletAddress as string;
      const { signature, message } = req.body;

      if (!walletAddress) {
        return next(new AppError('Wallet address required', 400, 'MISSING_WALLET'));
      }

      // Verify signature if provided (optional for GET requests)
      if (signature && message) {
        const isValid = await this.verifyWalletSignature(message, signature, walletAddress);
        if (!isValid) {
          return next(new AppError('Invalid wallet signature', 401, 'INVALID_SIGNATURE'));
        }
      }

      // Find or create user by wallet address
      let user = await this.userService.findByWalletAddress(walletAddress);
      
      if (!user) {
        try {
          // Create new user for this wallet
          user = await this.userService.createUser(walletAddress);
        } catch (error: any) {
          // If user was created between our check and create (race condition), fetch again
          if (error.code === 'USER_EXISTS') {
            user = await this.userService.findByWalletAddress(walletAddress);
            if (!user) {
              return next(new AppError('Failed to create or find user', 500));
            }
          } else {
            throw error;
          }
        }
      }

      // Check if user is active
      if (!user.isActive) {
        return next(new AppError('User account is deactivated', 401, 'ACCOUNT_DEACTIVATED'));
      }

      // Attach user to request
      req.user = {
        id: user.id,
        walletAddress: user.walletAddress,
      };

      next();
    } catch (error) {
      next(error);
    }
  };

  // Middleware to protect routes with MANDATORY wallet signature (for sensitive operations)
  public requireWalletWithSignature = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const walletAddress = req.body.walletAddress || req.query.walletAddress as string;
      // IMPORTANT: Get message and signature from raw body if available, otherwise from parsed body
      // This ensures we get the exact string that was sent, not a parsed/modified version
      let message: string;
      let signature: string;
      
      // Try to get from raw body first (if available)
      if ((req as any).rawBody) {
        try {
          const rawBody = JSON.parse((req as any).rawBody);
          message = rawBody.message;
          signature = rawBody.signature;
        } catch {
          // Fallback to parsed body
          message = req.body.message;
          signature = req.body.signature;
        }
      } else {
        // Use parsed body
        message = req.body.message;
        signature = req.body.signature;
      }
      
      // Log request (without sensitive data)
      logger.debug('Wallet signature verification requested', {
        walletAddress: walletAddress ? walletAddress.substring(0, 8) + '...' : 'missing',
        hasSignature: !!signature,
        hasMessage: !!message,
        messageLength: message?.length || 0,
        signatureLength: signature?.length || 0,
      });

      if (!walletAddress) {
        return next(new AppError('Wallet address required', 400, 'MISSING_WALLET'));
      }

      // SECURITY: Signature is MANDATORY for sensitive operations
      if (!signature || !message) {
        return next(new AppError('Wallet signature is required for this operation', 401, 'SIGNATURE_REQUIRED'));
      }

      // SECURITY: Check if account/IP is locked due to failed attempts
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const isIpLocked = accountLockoutService.isLocked(ipAddress);
      const isWalletLocked = accountLockoutService.isLocked(walletAddress);

      if (isIpLocked || isWalletLocked) {
        const lockoutInfo = isIpLocked 
          ? accountLockoutService.getLockoutInfo(ipAddress)
          : accountLockoutService.getLockoutInfo(walletAddress);

        logger.warn('Authentication attempt blocked - account locked', {
          walletAddress: walletAddress.substring(0, 8) + '...',
          ip: ipAddress,
          lockoutInfo,
        });

        this.auditService.logSecurity(AuditEventType.SECURITY_ACCOUNT_LOCKED, {
          walletAddress,
          ipAddress,
          userAgent: req.get('User-Agent'),
          requestPath: req.path,
          httpMethod: req.method,
          description: `Authentication blocked - account locked until ${lockoutInfo?.lockedUntil.toISOString()}`,
          metadata: {
            remainingMinutes: lockoutInfo?.remainingMinutes,
            failedAttempts: accountLockoutService.getFailedAttempts(walletAddress),
          },
        }).catch(err => logger.error('Failed to log audit event:', err));

        return next(new AppError(
          `Account locked due to too many failed attempts. Please try again in ${lockoutInfo?.remainingMinutes || 15} minutes.`,
          429,
          'ACCOUNT_LOCKED'
        ));
      }

      const isValid = await this.verifyWalletSignature(message, signature, walletAddress);
      if (!isValid) {
        // SECURITY: Record failed attempt for account lockout
        const ipLocked = accountLockoutService.recordFailedAttempt(ipAddress);
        const walletLocked = accountLockoutService.recordFailedAttempt(walletAddress);
        const failedAttempts = accountLockoutService.getFailedAttempts(walletAddress);

        logger.warn('Invalid wallet signature attempt', {
          walletAddress,
          ip: ipAddress,
          url: req.url,
          failedAttempts,
          locked: ipLocked || walletLocked,
        });
        
        // Audit log failed authentication
        this.auditService.logSecurity(AuditEventType.SECURITY_INVALID_SIGNATURE, {
          walletAddress,
          ipAddress,
          userAgent: req.get('User-Agent'),
          requestPath: req.path,
          httpMethod: req.method,
          description: `Invalid wallet signature verification (attempt ${failedAttempts}/5)`,
          metadata: {
            failedAttempts,
            locked: ipLocked || walletLocked,
          },
        }).catch(err => logger.error('Failed to log audit event:', err));

        // If locked after this attempt, return lockout message
        if (ipLocked || walletLocked) {
          const lockoutInfo = ipLocked 
            ? accountLockoutService.getLockoutInfo(ipAddress)
            : accountLockoutService.getLockoutInfo(walletAddress);

          return next(new AppError(
            `Too many failed attempts. Account locked for ${lockoutInfo?.remainingMinutes || 15} minutes.`,
            429,
            'ACCOUNT_LOCKED'
          ));
        }
        
        return next(new AppError('Invalid wallet signature', 401, 'INVALID_SIGNATURE'));
      }

      // SECURITY: Reset failed attempts on successful authentication
      accountLockoutService.resetFailedAttempts(ipAddress);
      accountLockoutService.resetFailedAttempts(walletAddress);

      // Find or create user by wallet address
      let user = await this.userService.findByWalletAddress(walletAddress);
      
      if (!user) {
        try {
          // Create new user for this wallet
          user = await this.userService.createUser(walletAddress);
        } catch (error: any) {
          // If user was created between our check and create (race condition), fetch again
          if (error.code === 'USER_EXISTS') {
            user = await this.userService.findByWalletAddress(walletAddress);
            if (!user) {
              return next(new AppError('Failed to create or find user', 500));
            }
          } else {
            throw error;
          }
        }
      }

      // Check if user is active
      if (!user.isActive) {
        return next(new AppError('User account is deactivated', 401, 'ACCOUNT_DEACTIVATED'));
      }

      // Attach user to request
      req.user = {
        id: user.id,
        walletAddress: user.walletAddress,
      };

      next();
    } catch (error) {
      next(error);
    }
  };

  // Optional wallet auth - doesn't fail if no wallet
  public optionalWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress } = req.body;
      
      if (walletAddress) {
        const user = await this.userService.findByWalletAddress(walletAddress);
        if (user && user.isActive) {
          req.user = {
            id: user.id,
            walletAddress: user.walletAddress,
          };
        }
      }
      
      next();
    } catch (error) {
      // Ignore errors in optional auth
      next();
    }
  };

  // Rate limiting by wallet address
  public rateLimitByWallet = (maxRequests: number, windowMs: number) => {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const walletAddress = req.user?.walletAddress || req.ip || 'unknown';
      const now = Date.now();

      // Clean up expired entries
      for (const [key, value] of requests.entries()) {
        if (now > value.resetTime) {
          requests.delete(key);
        }
      }

      const userRequests = requests.get(walletAddress);

      if (!userRequests) {
        requests.set(walletAddress, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      if (now > userRequests.resetTime) {
        requests.set(walletAddress, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      if (userRequests.count >= maxRequests) {
        return next(new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED'));
      }

      userRequests.count += 1;
      next();
    };
  };
}

// Create singleton instance
let walletAuthMiddleware: WalletAuthMiddleware;

export const initializeWalletAuth = (userService: UserService) => {
  walletAuthMiddleware = new WalletAuthMiddleware(userService);
  return walletAuthMiddleware;
};

export const getWalletAuth = () => {
  if (!walletAuthMiddleware) {
    throw new Error('Wallet auth middleware not initialized');
  }
  return walletAuthMiddleware;
};
