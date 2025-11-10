import { AppDataSource } from '../config/database';
import { logger } from '../middlewares/logger';

interface LockoutRecord {
  key: string; // IP address or wallet address
  failedAttempts: number;
  lockedUntil: number; // Timestamp
  lastAttempt: number; // Timestamp
}

/**
 * Account Lockout Service
 * 
 * Prevents brute force attacks by locking accounts/IPs after failed authentication attempts.
 * 
 * Features:
 * - Tracks failed attempts by IP address and wallet address
 * - Locks after 5 failed attempts
 * - Exponential backoff (lockout duration increases with each lockout)
 * - Automatic cleanup of expired lockouts
 */
export class AccountLockoutService {
  // In-memory storage (can be moved to DB or Redis if needed)
  private lockouts: Map<string, LockoutRecord> = new Map();
  
  // Configuration
  private readonly MAX_FAILED_ATTEMPTS = 5; // Lock after 5 failed attempts
  private readonly BASE_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes base
  private readonly MAX_LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours max
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes
  private readonly ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // Reset attempts after 1 hour of no failures

  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup job
    this.startCleanupJob();
  }

  /**
   * Record a failed authentication attempt
   * @param identifier - IP address or wallet address
   * @returns true if account is locked, false otherwise
   */
  public recordFailedAttempt(identifier: string): boolean {
    const now = Date.now();
    const key = identifier.toLowerCase();

    let record = this.lockouts.get(key);

    // Reset attempts if window expired
    if (record && (now - record.lastAttempt) > this.ATTEMPT_WINDOW_MS) {
      record.failedAttempts = 0;
    }

    // Create new record if doesn't exist
    if (!record) {
      record = {
        key,
        failedAttempts: 0,
        lockedUntil: 0,
        lastAttempt: now,
      };
    }

    // Increment failed attempts
    record.failedAttempts++;
    record.lastAttempt = now;

    // Check if should lock
    if (record.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      // Calculate lockout duration (exponential backoff)
      const lockoutCount = Math.floor((record.failedAttempts - this.MAX_FAILED_ATTEMPTS) / this.MAX_FAILED_ATTEMPTS) + 1;
      const lockoutDuration = Math.min(
        this.BASE_LOCKOUT_DURATION_MS * Math.pow(2, lockoutCount - 1),
        this.MAX_LOCKOUT_DURATION_MS
      );

      record.lockedUntil = now + lockoutDuration;

      logger.warn('Account locked due to failed attempts', {
        identifier: key.substring(0, 8) + '...',
        failedAttempts: record.failedAttempts,
        lockedUntil: new Date(record.lockedUntil).toISOString(),
        lockoutDurationMinutes: Math.round(lockoutDuration / 60000),
      });

      this.lockouts.set(key, record);
      return true;
    }

    this.lockouts.set(key, record);
    return false;
  }

  /**
   * Check if account/IP is currently locked
   * @param identifier - IP address or wallet address
   * @returns true if locked, false otherwise
   */
  public isLocked(identifier: string): boolean {
    const key = identifier.toLowerCase();
    const record = this.lockouts.get(key);

    if (!record) {
      return false;
    }

    const now = Date.now();

    // Check if lockout expired
    if (record.lockedUntil > 0 && now >= record.lockedUntil) {
      // Lockout expired, reset attempts
      record.failedAttempts = 0;
      record.lockedUntil = 0;
      this.lockouts.set(key, record);
      return false;
    }

    // Check if still locked
    if (record.lockedUntil > now) {
      return true;
    }

    return false;
  }

  /**
   * Get lockout information (for error messages)
   * @param identifier - IP address or wallet address
   * @returns Lockout info or null if not locked
   */
  public getLockoutInfo(identifier: string): { lockedUntil: Date; remainingMinutes: number } | null {
    const key = identifier.toLowerCase();
    const record = this.lockouts.get(key);

    if (!record || !this.isLocked(identifier)) {
      return null;
    }

    const now = Date.now();
    const remainingMs = record.lockedUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    return {
      lockedUntil: new Date(record.lockedUntil),
      remainingMinutes,
    };
  }

  /**
   * Reset failed attempts (on successful authentication)
   * @param identifier - IP address or wallet address
   */
  public resetFailedAttempts(identifier: string): void {
    const key = identifier.toLowerCase();
    const record = this.lockouts.get(key);

    if (record) {
      record.failedAttempts = 0;
      record.lockedUntil = 0;
      this.lockouts.set(key, record);
    }
  }

  /**
   * Get failed attempts count
   * @param identifier - IP address or wallet address
   * @returns Number of failed attempts
   */
  public getFailedAttempts(identifier: string): number {
    const key = identifier.toLowerCase();
    const record = this.lockouts.get(key);

    if (!record) {
      return 0;
    }

    // Reset if window expired
    const now = Date.now();
    if ((now - record.lastAttempt) > this.ATTEMPT_WINDOW_MS) {
      return 0;
    }

    return record.failedAttempts;
  }

  /**
   * Cleanup expired lockouts
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.lockouts.entries()) {
      // Remove if lockout expired and no recent attempts
      if (
        record.lockedUntil > 0 &&
        now >= record.lockedUntil &&
        (now - record.lastAttempt) > this.ATTEMPT_WINDOW_MS
      ) {
        this.lockouts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired lockout records`);
    }
  }

  /**
   * Start periodic cleanup job
   */
  private startCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL_MS);

    logger.info('Account lockout cleanup job started');
  }

  /**
   * Stop cleanup job (for testing)
   */
  public stopCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get statistics (for monitoring)
   */
  public getStats(): {
    totalLockouts: number;
    activeLockouts: number;
    totalRecords: number;
  } {
    const now = Date.now();
    let activeLockouts = 0;

    for (const record of this.lockouts.values()) {
      if (record.lockedUntil > now) {
        activeLockouts++;
      }
    }

    return {
      totalLockouts: this.lockouts.size,
      activeLockouts,
      totalRecords: this.lockouts.size,
    };
  }
}

// Singleton instance
export const accountLockoutService = new AccountLockoutService();

