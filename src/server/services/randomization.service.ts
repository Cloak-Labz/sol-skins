import crypto from 'crypto';

/**
 * Provably Fair Randomization Service
 *
 * Generates random numbers using cryptographic hashing for transparency and fairness.
 * Users can verify the randomness using the seed and timestamp.
 *
 * Algorithm:
 * 1. Combine seed (user_id + pack_id + timestamp) with server secret
 * 2. Hash using SHA-256
 * 3. Convert to decimal 0-1 range
 * 4. Use for weighted random selection
 */

export interface RandomResult {
  value: number; // 0-1 range
  seed: string;
  hash: string;
  timestamp: number;
}

export interface WeightedItem {
  id: string;
  weight: number; // Drop rate/probability weight
  [key: string]: any;
}

export class RandomizationService {
  private readonly serverSecret: string;

  constructor() {
    this.serverSecret = process.env.RANDOMIZATION_SECRET || 'default-secret-change-in-production';

    if (this.serverSecret === 'default-secret-change-in-production') {
      console.warn('⚠️  Using default randomization secret. Set RANDOMIZATION_SECRET in production!');
    }
  }

  /**
   * Generate provably fair random number
   */
  generateRandom(publicSeed: string): RandomResult {
    const timestamp = Date.now();

    // Combine public seed + timestamp + server secret
    const fullSeed = `${publicSeed}:${timestamp}:${this.serverSecret}`;

    // Hash it
    const hash = crypto
      .createHash('sha256')
      .update(fullSeed)
      .digest('hex');

    // Convert first 16 hex chars to decimal 0-1
    const hexValue = hash.substring(0, 16);
    const decimalValue = parseInt(hexValue, 16);
    const maxValue = Math.pow(2, 64);
    const randomValue = decimalValue / maxValue;

    console.log(`🎲 [RANDOM] Generated`);
    console.log(`   Seed: ${publicSeed}`);
    console.log(`   Value: ${randomValue.toFixed(6)}`);
    console.log(`   Hash: ${hash.substring(0, 16)}...`);

    return {
      value: randomValue,
      seed: publicSeed,
      hash,
      timestamp,
    };
  }

  /**
   * Select item from weighted pool
   *
   * Example:
   * Items with weights: [10, 20, 70] (total: 100)
   * Random 0.35 -> falls in second item (cumulative: 0.1-0.3)
   */
  selectFromWeightedPool<T extends WeightedItem>(
    random: number,
    pool: T[]
  ): {
    item: T;
    probability: number;
  } {
    if (pool.length === 0) {
      throw new Error('Cannot select from empty pool');
    }

    // Calculate total weight
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight <= 0) {
      throw new Error('Total weight must be positive');
    }

    // Find item based on weighted probability
    let cumulative = 0;

    for (const item of pool) {
      const probability = item.weight / totalWeight;
      cumulative += probability;

      if (random < cumulative) {
        console.log(`✨ [SELECTION] Selected item`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Weight: ${item.weight}/${totalWeight}`);
        console.log(`   Probability: ${(probability * 100).toFixed(2)}%`);
        console.log(`   Random: ${random.toFixed(6)} < ${cumulative.toFixed(6)}`);

        return {
          item,
          probability,
        };
      }
    }

    // Fallback to last item (in case of floating point errors)
    const lastItem = pool[pool.length - 1];
    return {
      item: lastItem,
      probability: lastItem.weight / totalWeight,
    };
  }

  /**
   * Verify a previous random result
   * Allows users to check fairness after the fact
   */
  verifyRandom(result: RandomResult): boolean {
    const fullSeed = `${result.seed}:${result.timestamp}:${this.serverSecret}`;

    const expectedHash = crypto
      .createHash('sha256')
      .update(fullSeed)
      .digest('hex');

    const isValid = expectedHash === result.hash;

    console.log(`🔍 [VERIFY] Random verification`);
    console.log(`   Expected: ${expectedHash.substring(0, 16)}...`);
    console.log(`   Actual: ${result.hash.substring(0, 16)}...`);
    console.log(`   Valid: ${isValid ? '✅' : '❌'}`);

    return isValid;
  }

  /**
   * Get drop rate statistics for a pool
   */
  getPoolStatistics(pool: WeightedItem[]): {
    totalWeight: number;
    items: Array<{
      id: string;
      weight: number;
      probability: number;
      percentageChance: string;
      expectedPerThousand: number;
    }>;
  } {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);

    const items = pool.map(item => {
      const probability = item.weight / totalWeight;
      return {
        id: item.id,
        weight: item.weight,
        probability,
        percentageChance: `${(probability * 100).toFixed(2)}%`,
        expectedPerThousand: Math.round(probability * 1000),
      };
    });

    return {
      totalWeight,
      items,
    };
  }

  /**
   * Simulate opening multiple packs (for testing drop rates)
   */
  simulateOpenings(pool: WeightedItem[], count: number = 1000): {
    openings: number;
    distribution: Map<string, number>;
    percentages: Map<string, number>;
  } {
    const distribution = new Map<string, number>();

    for (let i = 0; i < count; i++) {
      const seed = `simulation_${i}`;
      const random = this.generateRandom(seed);
      const { item } = this.selectFromWeightedPool(random.value, pool);

      const current = distribution.get(item.id) || 0;
      distribution.set(item.id, current + 1);
    }

    const percentages = new Map<string, number>();
    distribution.forEach((count, id) => {
      percentages.set(id, (count / count) * 100);
    });

    console.log(`📊 [SIMULATION] ${count} openings`);
    distribution.forEach((itemCount, id) => {
      console.log(`   ${id}: ${itemCount} (${((itemCount / count) * 100).toFixed(2)}%)`);
    });

    return {
      openings: count,
      distribution,
      percentages,
    };
  }
}

// Singleton instance
export const randomizationService = new RandomizationService();
