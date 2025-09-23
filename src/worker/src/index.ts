import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { config } from './lib/config';
import { PriceOracle } from './jobs/price-oracle';
import { SnapshotGenerator } from './jobs/snapshot-generator';
import { OnChainListener } from './listeners/onchain-listener';

const prisma = new PrismaClient();

class Worker {
  private priceOracle: PriceOracle;
  private snapshotGenerator: SnapshotGenerator;
  private onChainListener: OnChainListener;

  constructor() {
    this.priceOracle = new PriceOracle(prisma);
    this.snapshotGenerator = new SnapshotGenerator(prisma);
    this.onChainListener = new OnChainListener(prisma);
  }

  async start() {
    console.log('🚀 Starting PhygiBox Worker...');

    // Start price oracle (runs every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
      console.log('📊 Running price oracle...');
      try {
        await this.priceOracle.updatePrices();
        console.log('✅ Price oracle completed');
      } catch (error) {
        console.error('❌ Price oracle failed:', error);
      }
    });

    // Start snapshot generator (runs every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
      console.log('📸 Running snapshot generator...');
      try {
        await this.snapshotGenerator.generateSnapshot();
        console.log('✅ Snapshot generator completed');
      } catch (error) {
        console.error('❌ Snapshot generator failed:', error);
      }
    });

    // Start on-chain listener
    console.log('👂 Starting on-chain listener...');
    try {
      await this.onChainListener.start();
      console.log('✅ On-chain listener started');
    } catch (error) {
      console.error('❌ On-chain listener failed to start:', error);
    }

    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('🛑 Shutting down worker gracefully...');
      await this.onChainListener.stop();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    console.log('✅ Worker started successfully');
  }
}

const worker = new Worker();
worker.start().catch((error) => {
  console.error('❌ Failed to start worker:', error);
  process.exit(1);
});
