import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { config } from '../config/env';
import { AppError } from './errorHandler';
import { logger } from './logger';
import { UserService } from '../services/UserService';
import { tokenBlacklistService } from '../services/TokenBlacklistService';

interface JWTPayload {
  userId: string;
  walletAddress: string;
  iat: number;
  exp: number;
}

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

export class AuthMiddleware {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
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
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = new PublicKey(publicKey).toBytes();

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

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

  // Generate JWT token
  public generateToken = (userId: string, walletAddress: string): string => {
    return jwt.sign(
      { userId, walletAddress },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );
  };

  // Verify JWT token
  public verifyToken = (token: string): JWTPayload => {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
  };

  // Middleware to protect routes
  public protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1) Get token from header
      let token: string | undefined;
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      if (!token) {
        return next(new AppError('No token provided', 401, 'NO_TOKEN'));
      }

      // 2) Check if token is blacklisted (revoked)
      if (tokenBlacklistService.isTokenBlacklisted(token)) {
        logger.warn('Blacklisted token attempted to access protected route', {
          tokenPrefix: token.substring(0, 10) + '...',
          ip: req.ip,
          url: req.url,
        });
        return next(new AppError('Token has been revoked', 401, 'TOKEN_REVOKED'));
      }

      // 3) Verify token
      const decoded = this.verifyToken(token);

      // 4) Check if user still exists
      const user = await this.userService.findById(decoded.userId);
      if (!user) {
        return next(new AppError('User no longer exists', 401, 'USER_NOT_FOUND'));
      }

      // 5) Check if user is active
      if (!user.isActive) {
        return next(new AppError('User account is deactivated', 401, 'ACCOUNT_DEACTIVATED'));
      }

      // 6) Attach user to request
      req.user = {
        id: user.id,
        walletAddress: user.walletAddress,
      };

      next();
    } catch (error) {
      next(error);
    }
  };

  // Optional auth - doesn't fail if no token
  public optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        // Check if token is blacklisted
        if (!tokenBlacklistService.isTokenBlacklisted(token)) {
          try {
            const decoded = this.verifyToken(token);
            const user = await this.userService.findById(decoded.userId);
            if (user && user.isActive) {
              req.user = {
                id: user.id,
                walletAddress: user.walletAddress,
              };
            }
          } catch {
            // Invalid token, ignore in optional auth
          }
        }
      }
      
      next();
    } catch (error) {
      // Ignore errors in optional auth
      next();
    }
  };

  // Rate limiting by wallet address (uses in-memory storage)
  public rateLimitByWallet = (maxRequests: number, windowMs: number) => {
    const { rateLimitService } = require('../services/RateLimitService');
    
    return rateLimitService.createRateLimitMiddleware(
      maxRequests,
      windowMs,
      (req: Request) => {
        // Use wallet address if authenticated, otherwise use IP
        return req.user?.walletAddress || req.ip || 'unknown';
      }
    );
  };

  // Validate wallet ownership (for sensitive operations)
  public validateWalletOwnership = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { signature, message } = req.body;
      
      if (!signature || !message) {
        return next(new AppError('Signature and message required for wallet validation', 400, 'MISSING_SIGNATURE'));
      }

      const isValid = await this.verifyWalletSignature(
        message,
        signature,
        req.user!.walletAddress
      );

      if (!isValid) {
        return next(new AppError('Invalid wallet signature', 401, 'INVALID_SIGNATURE'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Create singleton instance
let authMiddleware: AuthMiddleware;

export const initializeAuth = (userService: UserService) => {
  authMiddleware = new AuthMiddleware(userService);
  return authMiddleware;
};

export const getAuth = () => {
  if (!authMiddleware) {
    throw new Error('Auth middleware not initialized');
  }
  return authMiddleware;
}; 