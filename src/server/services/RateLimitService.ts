import { Request, Response, NextFunction } from 'express';
import { logger } from '../middlewares/logger';
import { AppError } from '../middlewares/errorHandler';

/**
 * Rate Limiting Service using in-memory storage
 */
export class RateLimitService {
  private inMemoryStore: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up in-memory store every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInMemoryStore();
    }, 5 * 60 * 1000);
  }

  /**
   * Create rate limit middleware
   */
  createRateLimitMiddleware(
    maxRequests: number,
    windowMs: number,
    keyGenerator?: (req: Request) => string
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Generate key for rate limiting
        const key = keyGenerator 
          ? keyGenerator(req)
          : req.user?.walletAddress || req.ip || 'unknown';
        
        const now = Date.now();
        this.handleInMemoryRateLimit(key, maxRequests, windowMs, now, next);
      } catch (error) {
        logger.error('Rate limit error:', error);
        // On error, allow request (fail open)
        next();
      }
    };
  }

  /**
   * Handle rate limiting with in-memory Map (fallback)
   */
  private handleInMemoryRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    now: number,
    next: NextFunction
  ) {
    const userRequests = this.inMemoryStore.get(key);

    if (!userRequests) {
      this.inMemoryStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (now > userRequests.resetTime) {
      this.inMemoryStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userRequests.count >= maxRequests) {
      const remainingTime = Math.ceil((userRequests.resetTime - now) / 1000 / 60);
      return next(
        new AppError(
          `Too many requests. Try again in ${remainingTime} minute(s)`,
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    userRequests.count += 1;
    next();
  }

  /**
   * Clean up expired entries from in-memory store
   */
  private cleanupInMemoryStore(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.inMemoryStore.entries()) {
      if (now > value.resetTime) {
        this.inMemoryStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit entries from memory`);
    }

    // Limit memory usage - if store gets too large, clear half
    if (this.inMemoryStore.size > 10000) {
      const entries = Array.from(this.inMemoryStore.entries());
      this.inMemoryStore = new Map(entries.slice(5000));
      logger.warn('Rate limit in-memory store exceeded 10k entries, cleared half');
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  resetRateLimit(key: string): void {
    this.inMemoryStore.delete(key);
  }

  /**
   * Get current rate limit status for a key
   */
  getRateLimitStatus(key: string, maxRequests: number): {
    count: number;
    remaining: number;
    resetTime: number;
  } {
    const userRequests = this.inMemoryStore.get(key);
    if (!userRequests) {
      return {
        count: 0,
        remaining: maxRequests,
        resetTime: Date.now(),
      };
    }
    
    return {
      count: userRequests.count,
      remaining: Math.max(0, maxRequests - userRequests.count),
      resetTime: userRequests.resetTime,
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.inMemoryStore.clear();
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService();

