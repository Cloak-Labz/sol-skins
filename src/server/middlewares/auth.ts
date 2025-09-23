import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { config } from '../config/env';
import { AppError } from './errorHandler';
import { logger } from './logger';
import { UserService } from '../services/UserService';

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
  public verifyWalletSignature = (
    message: string,
    signature: string,
    publicKey: string
  ): boolean => {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = new PublicKey(publicKey).toBytes();

      return nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );
    } catch (error) {
      logger.error('Wallet signature verification failed:', error);
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

      // 2) Verify token
      const decoded = this.verifyToken(token);

      // 3) Check if user still exists
      const user = await this.userService.findById(decoded.userId);
      if (!user) {
        return next(new AppError('User no longer exists', 401, 'USER_NOT_FOUND'));
      }

      // 4) Check if user is active
      if (!user.isActive) {
        return next(new AppError('User account is deactivated', 401, 'ACCOUNT_DEACTIVATED'));
      }

      // 5) Attach user to request
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
        const decoded = this.verifyToken(token);
        
        const user = await this.userService.findById(decoded.userId);
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
      const walletAddress = req.user?.walletAddress || req.ip;
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

  // Validate wallet ownership (for sensitive operations)
  public validateWalletOwnership = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { signature, message } = req.body;
      
      if (!signature || !message) {
        return next(new AppError('Signature and message required for wallet validation', 400, 'MISSING_SIGNATURE'));
      }

      const isValid = this.verifyWalletSignature(
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