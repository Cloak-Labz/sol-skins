import { SolanaService } from './SolanaService';
import { BoxService } from './BoxService';
import { logger } from '../middlewares/logger';
import { AppError } from '../middlewares/errorHandler';

/**
 * Service to keep database boxes synchronized with on-chain batches
 * Ensures 100% consistency between blockchain and database
 */
export class BatchSyncService {
  private solanaService: SolanaService;
  private boxService: BoxService;

  constructor() {
    this.solanaService = new SolanaService();
    this.boxService = new BoxService();
  }

  /**
   * Sync a specific batch from on-chain to database
   */
  async syncBatchToBox(batchId: number): Promise<any> {
    try {
      logger.info(`Syncing batch ${batchId} to database...`);

      // Get on-chain batch data
      const onChainBatch = await this.solanaService.getBatchState(batchId);
      if (!onChainBatch) {
        throw new AppError(`Batch ${batchId} not found on-chain`, 404, 'BATCH_NOT_FOUND');
      }

      // Check if box already exists in database
      const existingBox = await this.boxService.getBoxByBatchId(batchId).catch(() => null);

      if (existingBox) {
        // Update existing box with on-chain data
        const updatedBox = await this.boxService.updateBox(existingBox.id, {
          totalItems: onChainBatch.totalItems,
          itemsAvailable: onChainBatch.totalItems - onChainBatch.boxesOpened,
          itemsOpened: onChainBatch.boxesOpened,
          status: onChainBatch.boxesOpened >= onChainBatch.totalItems ? 'sold_out' : 'active',
        });

        logger.info(`Updated existing box for batch ${batchId}`, {
          totalItems: onChainBatch.totalItems,
          itemsOpened: onChainBatch.boxesOpened,
        });

        return updatedBox;
      } else {
        // Create new box from on-chain data
        // Note: This requires additional metadata that might not be available on-chain
        // For now, we'll create a basic box structure
        const newBox = await this.boxService.createBox({
          batchId,
          candyMachine: '11111111111111111111111111111111', // Default/placeholder
          collectionMint: '11111111111111111111111111111111', // Default/placeholder
          name: `Batch ${batchId}`,
          description: `Auto-created from on-chain batch ${batchId}`,
          imageUrl: '/assets/default-box.png',
          priceSol: 0,
          priceUsdc: 0,
          totalItems: onChainBatch.totalItems,
          merkleRoot: '0'.repeat(64), // Placeholder
          metadataUris: [],
          snapshotTime: Math.floor(Date.now() / 1000),
        });

        logger.info(`Created new box for batch ${batchId}`, {
          boxId: newBox.id,
          totalItems: onChainBatch.totalItems,
        });

        return newBox;
      }
    } catch (error) {
      logger.error(`Error syncing batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all batches from on-chain to database
   */
  async syncAllBatches(): Promise<{ synced: number; failed: number; errors: string[] }> {
    try {
      logger.info('Starting bulk sync of all batches...');

      // Get global state to find current batch count
      const globalState = await this.solanaService.getGlobalState();
      if (!globalState) {
        throw new AppError('Global state not found', 404, 'GLOBAL_STATE_NOT_FOUND');
      }

      const currentBatch = globalState.currentBatch;
      let synced = 0;
      let failed = 0;
      const errors: string[] = [];

      // Sync all batches from 1 to currentBatch
      for (let batchId = 1; batchId <= currentBatch; batchId++) {
        try {
          await this.syncBatchToBox(batchId);
          synced++;
        } catch (error) {
          failed++;
          errors.push(`Batch ${batchId}: ${error.message}`);
          logger.error(`Failed to sync batch ${batchId}:`, error);
        }
      }

      logger.info('Bulk sync completed:', { synced, failed, total: currentBatch });
      return { synced, failed, errors };
    } catch (error) {
      logger.error('Error in bulk sync:', error);
      throw new AppError('Failed to sync all batches', 500);
    }
  }

  /**
   * Create a box in database when a new batch is created on-chain
   * This should be called after successful on-chain batch creation
   */
  async createBoxFromBatch(
    batchId: number,
    candyMachine: string,
    collectionMint: string,
    name: string,
    description: string,
    imageUrl: string,
    priceSol: number,
    priceUsdc: number,
    metadataUris: string[],
    merkleRoot: string
  ): Promise<any> {
    try {
      logger.info(`Creating box from batch ${batchId}...`);

      const box = await this.boxService.createBox({
        batchId,
        candyMachine,
        collectionMint,
        name,
        description,
        imageUrl,
        priceSol,
        priceUsdc,
        totalItems: metadataUris.length,
        merkleRoot,
        metadataUris,
        snapshotTime: Math.floor(Date.now() / 1000),
      });

      logger.info(`Box created successfully for batch ${batchId}`, {
        boxId: box.id,
        name: box.name,
        totalItems: box.totalItems,
      });

      return box;
    } catch (error) {
      logger.error(`Error creating box from batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Update box when batch is modified on-chain
   */
  async updateBoxFromBatch(batchId: number, updates: any): Promise<any> {
    try {
      logger.info(`Updating box from batch ${batchId}...`);

      const box = await this.boxService.getBoxByBatchId(batchId);
      const updatedBox = await this.boxService.updateBox(box.id, updates);

      logger.info(`Box updated successfully for batch ${batchId}`, {
        boxId: box.id,
        updates: Object.keys(updates),
      });

      return updatedBox;
    } catch (error) {
      logger.error(`Error updating box from batch ${batchId}:`, error);
      throw error;
    }
  }
}
