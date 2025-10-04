import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { AppError } from './errorHandler';
import { logger } from './logger';
import { UserService } from '../services/UserService';

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

  // Middleware to protect routes with wallet authentication
  public requireWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // For GET requests, check query params; for POST/PUT, check body
      const walletAddress = req.body.walletAddress || req.query.walletAddress as string;
      const { signature, message } = req.body;

      if (!walletAddress) {
        return next(new AppError('Wallet address required', 400, 'MISSING_WALLET'));
      }

      // Verify signature if provided
      if (signature && message) {
        const isValid = this.verifyWalletSignature(message, signature, walletAddress);
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
