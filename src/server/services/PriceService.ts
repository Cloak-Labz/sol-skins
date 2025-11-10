import { httpService } from '../utils/httpService';
import { logger } from '../middlewares/logger';

/**
 * Simple price service for fetching SOL/USD with in-memory caching.
 * Falls back to last known price if provider is unavailable.
 */
class PriceService {
  private cache: {
    solUsd?: number;
    fetchedAt?: number;
  } = {};

  private readonly ttlMs = 60_000; // 1 minute

  private isFresh(): boolean {
    if (!this.cache.fetchedAt) return false;
    return Date.now() - this.cache.fetchedAt < this.ttlMs;
    }

  async getSolPriceUsd(): Promise<number> {
    // Return cached if fresh
    if (this.isFresh() && this.cache.solUsd && this.cache.solUsd > 0) {
      return this.cache.solUsd;
    }

    // Try CoinGecko first
    try {
      const data = await httpService.get<any>(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        undefined,
        { serviceName: 'coingecko', timeout: 5_000 }
      );
      const price = Number(data?.solana?.usd);
      if (Number.isFinite(price) && price > 0) {
        this.cache.solUsd = price;
        this.cache.fetchedAt = Date.now();
        return price;
      }
    } catch (err) {
      logger.warn('Failed to fetch SOL price from CoinGecko, will try fallback', { err });
    }

    // Try Coinbase as fallback
    try {
      const data = await httpService.get<any>(
        'https://api.coinbase.com/v2/prices/SOL-USD/spot',
        undefined,
        { serviceName: 'coinbase', timeout: 5_000 }
      );
      const price = Number(data?.data?.amount);
      if (Number.isFinite(price) && price > 0) {
        this.cache.solUsd = price;
        this.cache.fetchedAt = Date.now();
        return price;
      }
    } catch (err) {
      logger.warn('Failed to fetch SOL price from Coinbase', { err });
    }

    // Final fallback to last cached price if available
    if (this.cache.solUsd && this.cache.solUsd > 0) {
      return this.cache.solUsd;
    }

    throw new Error('Failed to fetch SOL price from all providers');
  }
}

export const priceService = new PriceService();


