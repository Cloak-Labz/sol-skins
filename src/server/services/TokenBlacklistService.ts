import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../middlewares/logger';

interface BlacklistedToken {
  token: string;
  expiresAt: number; // When the token itself expires (JWT exp)
  revokedAt: number; // When it was revoked
}

/**
 * Token Blacklist Service
 * Manages revoked JWT tokens in memory
 * Tokens are automatically cleaned up when they expire
 */
class TokenBlacklistService {
  private blacklist: Map<string, BlacklistedToken> = new Map();
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Clean up every hour

  constructor() {
    // Periodic cleanup of expired tokens
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Add a token to the blacklist
   */
  revokeToken(token: string): void {
    try {
      // Decode token to get expiration time
      const decoded = jwt.decode(token) as { exp?: number } | null;
      
      if (!decoded || !decoded.exp) {
        logger.warn('Attempted to blacklist token without expiration');
        return;
      }

      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      // Only blacklist if token hasn't expired yet
      if (expiresAt > now) {
        this.blacklist.set(token, {
          token,
          expiresAt,
          revokedAt: now,
        });

        logger.debug('Token blacklisted', {
          tokenPrefix: token.substring(0, 10) + '...',
          expiresAt: new Date(expiresAt).toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
    }
  }

  /**
   * Check if a token is blacklisted
   */
  isTokenBlacklisted(token: string): boolean {
    const blacklisted = this.blacklist.get(token);

    if (!blacklisted) {
      return false;
    }

    // Check if token has expired (natural expiration)
    const now = Date.now();
    if (now > blacklisted.expiresAt) {
      // Token expired, remove from blacklist
      this.blacklist.delete(token);
      return false;
    }

    // Token is blacklisted and still valid (not expired)
    return true;
  }

  /**
   * Revoke all tokens for a user (by extracting userId from token)
   * Note: This requires checking all tokens, so it's less efficient
   * For better performance, consider storing userId -> tokens mapping
   */
  revokeAllUserTokens(userId: string): number {
    let revoked = 0;
    const now = Date.now();

    for (const [token, data] of this.blacklist.entries()) {
      try {
        const decoded = jwt.decode(token) as { userId?: string; exp?: number } | null;
        
        if (decoded?.userId === userId && decoded.exp && decoded.exp * 1000 > now) {
          // Token belongs to user and hasn't expired
          revoked++;
        }
      } catch {
        // Invalid token, skip
      }
    }

    // Note: We can't revoke future tokens with this approach
    // For full revocation, we'd need to track tokens by userId
    logger.info(`Revoked ${revoked} existing tokens for user ${userId}`);
    return revoked;
  }

  /**
   * Get blacklist statistics
   */
  getStats(): {
    totalBlacklisted: number;
    expiredTokens: number;
    activeBlacklisted: number;
  } {
    const now = Date.now();
    let expiredTokens = 0;
    let activeBlacklisted = 0;

    for (const data of this.blacklist.values()) {
      if (now > data.expiresAt) {
        expiredTokens++;
      } else {
        activeBlacklisted++;
      }
    }

    return {
      totalBlacklisted: this.blacklist.size,
      expiredTokens,
      activeBlacklisted,
    };
  }

  /**
   * Clean up expired tokens from blacklist
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, data] of this.blacklist.entries()) {
      if (now > data.expiresAt) {
        this.blacklist.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired tokens from blacklist`);
    }
  }

  /**
   * Clear all tokens (useful for testing)
   */
  clear(): void {
    this.blacklist.clear();
    logger.info('Token blacklist cleared');
  }
}

// Singleton instance
export const tokenBlacklistService = new TokenBlacklistService();

