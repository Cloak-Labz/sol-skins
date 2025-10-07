import { PrismaClient } from '@prisma/client';
import { config } from '../lib/config';
import { type OraclePrice } from '@phygibox/types';

export class PriceOracle {
  constructor(private prisma: PrismaClient) {}

  async updatePrices(): Promise<void> {
    console.log('📊 Updating oracle prices...');

    // Get all available skins
    const skins = await this.prisma.skin.findMany({
      where: { status: 'available' },
      select: {
        id: true,
        priceRef: true,
        inventoryRef: true,
      },
    });

    const prices: OraclePrice[] = [];

    for (const skin of skins) {
      // Mock price calculation - in production, this would aggregate from multiple sources
      const basePrice = Number(skin.priceRef);
      const volatility = 0.1; // 10% volatility
      const randomFactor = (Math.random() - 0.5) * 2 * volatility;
      const currentPrice = Math.max(basePrice * (1 + randomFactor), 0.01);
      
      // Convert to micro-USDC
      const priceInMicroUSDC = Math.floor(currentPrice * 1_000_000);
      const timestamp = Date.now();

      const oraclePrice: OraclePrice = {
        inventoryId: skin.inventoryRef,
        price: priceInMicroUSDC,
        timestamp,
      };

      prices.push(oraclePrice);
    }

    // Store prices in database (in production, this would be a cache/redis)
    console.log(`📊 Generated ${prices.length} price updates`);

    // In a real implementation, you would:
    // 1. Verify prices against multiple sources (Steam Market, CSGOFloat, DMarket, etc.)
    // 2. Calculate VWAP/median to get accurate market price
    // 3. Store in cache/database for API consumption
    // 4. Backend passes these prices directly to the Solana program when needed

    console.log('✅ Price oracle update completed');
  }

  async getPriceForSkin(skinId: string): Promise<OraclePrice | null> {
    const skin = await this.prisma.skin.findUnique({
      where: { id: skinId },
      select: {
        inventoryRef: true,
        priceRef: true,
      },
    });

    if (!skin) {
      return null;
    }

    const basePrice = Number(skin.priceRef);
    const currentPrice = Math.floor(basePrice * 1_000_000);
    const timestamp = Date.now();

    return {
      inventoryId: skin.inventoryRef,
      price: currentPrice,
      timestamp,
    };
  }
}
