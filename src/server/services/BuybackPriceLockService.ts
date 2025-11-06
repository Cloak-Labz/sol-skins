import { logger } from '../middlewares/logger';

/**
 * Buyback Price Lock Service
 * 
 * Prevents front-running attacks by locking the buyback price for a specific period.
 * Once a buyback calculation is requested, the price is "locked" and cannot change
 * until it expires or is used.
 * 
 * SECURITY: Front-running protection
 * - Price is locked when calculation is requested
 * - Lock expires after PRICE_LOCK_DURATION_MS (default: 5 minutes)
 * - Amount in transaction must match locked amount
 * - Prevents attackers from front-running with updated prices
 */

interface PriceLock {
  nftMint: string;
  walletAddress: string;
  buybackAmount: number;
  buybackAmountLamports: string;
  skinPrice: number;
  lockedAt: Date;
  expiresAt: Date;
  used: boolean; // Set to true when buyback is confirmed
}

export class BuybackPriceLockService {
  private priceLocks: Map<string, PriceLock> = new Map();
  private readonly PRICE_LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // Clean up every minute

  constructor() {
    this.startCleanupJob();
    logger.info('✅ BuybackPriceLockService initialized');
  }

  /**
   * Lock a buyback price for a specific NFT and wallet
   * Returns a lock ID that must be used when confirming the buyback
   */
  lockPrice(
    nftMint: string,
    walletAddress: string,
    buybackAmount: number,
    buybackAmountLamports: string,
    skinPrice: number
  ): string {
    const lockId = this.generateLockId(nftMint, walletAddress);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.PRICE_LOCK_DURATION_MS);

    const lock: PriceLock = {
      nftMint,
      walletAddress,
      buybackAmount,
      buybackAmountLamports,
      skinPrice,
      lockedAt: now,
      expiresAt,
      used: false,
    };

    this.priceLocks.set(lockId, lock);
    logger.info(`Price locked for buyback: ${nftMint.substring(0, 8)}...`, {
      walletAddress: walletAddress.substring(0, 8) + '...',
      buybackAmount,
      expiresAt: expiresAt.toISOString(),
    });

    return lockId;
  }

  /**
   * Validate that the buyback amount matches the locked price
   * Returns true if valid, throws error if invalid
   */
  validateLockedPrice(
    nftMint: string,
    walletAddress: string,
    buybackAmountLamports: string
  ): { valid: boolean; error?: string } {
    const lockId = this.generateLockId(nftMint, walletAddress);
    const lock = this.priceLocks.get(lockId);

    if (!lock) {
      return {
        valid: false,
        error: 'Buyback price lock not found. Please request a new buyback calculation.',
      };
    }

    // Check if lock has expired
    const now = new Date();
    if (now > lock.expiresAt) {
      this.priceLocks.delete(lockId);
      return {
        valid: false,
        error: 'Buyback price lock has expired. Please request a new buyback calculation.',
      };
    }

    // Check if lock has already been used
    if (lock.used) {
      return {
        valid: false,
        error: 'This buyback price lock has already been used. Please request a new buyback calculation.',
      };
    }

    // Validate that the amount matches the locked amount
    // Use string comparison to avoid floating point issues
    if (buybackAmountLamports !== lock.buybackAmountLamports) {
      logger.warn('Buyback amount mismatch:', {
        nftMint: nftMint.substring(0, 8) + '...',
        walletAddress: walletAddress.substring(0, 8) + '...',
        expected: lock.buybackAmountLamports,
        received: buybackAmountLamports,
      });
      return {
        valid: false,
        error: `Buyback amount mismatch. Expected ${lock.buybackAmountLamports}, received ${buybackAmountLamports}. Price may have changed. Please request a new buyback calculation.`,
      };
    }

    // Mark lock as used
    lock.used = true;
    this.priceLocks.set(lockId, lock);

    logger.info('Price lock validated successfully:', {
      nftMint: nftMint.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
      buybackAmountLamports,
    });

    return { valid: true };
  }

  /**
   * Get locked price information (for debugging/monitoring)
   */
  getLockInfo(nftMint: string, walletAddress: string): PriceLock | null {
    const lockId = this.generateLockId(nftMint, walletAddress);
    return this.priceLocks.get(lockId) || null;
  }

  /**
   * Generate a unique lock ID from NFT mint and wallet address
   */
  private generateLockId(nftMint: string, walletAddress: string): string {
    return `${nftMint}:${walletAddress}`;
  }

  /**
   * Periodically clean up expired locks
   */
  private startCleanupJob(): void {
    setInterval(() => {
      const now = new Date();
      let cleanedCount = 0;

      this.priceLocks.forEach((lock, lockId) => {
        // Remove expired or used locks
        if (now > lock.expiresAt || lock.used) {
          this.priceLocks.delete(lockId);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        logger.debug(`Cleaned up ${cleanedCount} expired/used buyback price locks.`);
      }
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Get statistics about current locks (for monitoring)
   */
  getStats(): {
    totalLocks: number;
    activeLocks: number;
    usedLocks: number;
    expiredLocks: number;
  } {
    const now = new Date();
    let activeLocks = 0;
    let usedLocks = 0;
    let expiredLocks = 0;

    this.priceLocks.forEach((lock) => {
      if (lock.used) {
        usedLocks++;
      } else if (now > lock.expiresAt) {
        expiredLocks++;
      } else {
        activeLocks++;
      }
    });

    return {
      totalLocks: this.priceLocks.size,
      activeLocks,
      usedLocks,
      expiredLocks,
    };
  }
}

export const buybackPriceLockService = new BuybackPriceLockService();

