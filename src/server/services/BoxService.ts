import { BoxRepository } from '../repositories/BoxRepository';
import { SolanaService } from './SolanaService';
import { logger } from '../middlewares/logger';
import { AppError } from '../middlewares/errorHandler';

export interface CreateBoxDTO {
  batchId?: number;
  candyMachine?: string;
  collectionMint?: string;
  candyGuard?: string;
  treasuryAddress?: string;
  symbol?: string;
  sellerFeeBasisPoints?: number;
  isMutable?: boolean;
  name: string;
  description?: string;
  imageUrl?: string;
  priceSol?: number;
  priceUsdc?: number;
  totalItems: number;
  merkleRoot?: string;
  metadataUris: string[];
  snapshotTime?: number;
  createTx?: string;
  status?: string;
  itemsAvailable?: number;
  itemsOpened?: number;
}

export interface UpdateBoxDTO {
  batchId?: number;
  name?: string;
  description?: string;
  imageUrl?: string;
  priceSol?: number;
  priceUsdc?: number;
  status?: 'active' | 'paused' | 'sold_out' | 'ended';
  itemsAvailable?: number;
  itemsOpened?: number;
  metadataUris?: string[];
  updateTx?: string;
}

export class BoxService {
  private boxRepository: BoxRepository;
  private solanaService: SolanaService;

  constructor() {
    this.boxRepository = new BoxRepository();
    try {
      this.solanaService = new SolanaService();
    } catch (error) {
      logger.warn('SolanaService not available, sync features will be limited');
      this.solanaService = null as any;
    }
  }

  async getAllBoxes(): Promise<any[]> {
    try {
      return await this.boxRepository.findAll();
    } catch (error) {
      logger.error('Error fetching all boxes:', error);
      throw new AppError('Failed to fetch boxes', 500);
    }
  }

  async getBoxById(id: string): Promise<any> {
    try {
      const box = await this.boxRepository.findById(id);
      if (!box) {
        throw new AppError('Box not found', 404, 'BOX_NOT_FOUND');
      }
      return box;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching box by ID:', error);
      throw new AppError('Failed to fetch box', 500);
    }
  }

  async getBoxByBatchId(batchId: number): Promise<any> {
    try {
      const box = await this.boxRepository.findByBatchId(batchId);
      if (!box) {
        throw new AppError('Box not found', 404, 'BOX_NOT_FOUND');
      }
      return box;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching box by batch ID:', error);
      throw new AppError('Failed to fetch box', 500);
    }
  }

  async getActiveBoxes(): Promise<any[]> {
    try {
      return await this.boxRepository.findAll();
    } catch (error) {
      logger.error('Error fetching active boxes:', error);
      throw new AppError('Failed to fetch active boxes', 500);
    }
  }

  async createBox(data: CreateBoxDTO): Promise<any> {
    try {
      // Check if box with this batch ID already exists (only if batchId is provided)
      if (data.batchId) {
        const existingBox = await this.boxRepository.findByBatchId(data.batchId);
        if (existingBox) {
          throw new AppError('Box with this batch ID already exists', 400, 'DUPLICATE_BATCH_ID');
        }
      }

      const box = await this.boxRepository.create({
        ...data,
        candyMachine: data.candyMachine || '11111111111111111111111111111111',
        collectionMint: data.collectionMint || '11111111111111111111111111111111',
        candyGuard: data.candyGuard,
        treasuryAddress: data.treasuryAddress,
        symbol: data.symbol || 'SKIN',
        sellerFeeBasisPoints: data.sellerFeeBasisPoints || 500,
        isMutable: data.isMutable || false,
        imageUrl: data.imageUrl || '',
        priceSol: data.priceSol || 0,
        priceUsdc: data.priceUsdc || 0,
        merkleRoot: data.merkleRoot || '',
        metadataUris: data.metadataUris || [], // Add default empty array for metadataUris
        snapshotTime: data.snapshotTime || Math.floor(Date.now() / 1000),
        itemsAvailable: data.itemsAvailable || data.totalItems,
        itemsOpened: data.itemsOpened || 0,
        status: data.status || 'active',
        isSynced: true,
        lastSyncedAt: new Date(),
      });

      logger.info('Box created:', { id: box.id, batchId: box.batchId, name: box.name });
      return box;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating box:', error);
      throw new AppError('Failed to create box', 500);
    }
  }

  async updateBox(id: string, data: UpdateBoxDTO): Promise<any> {
    try {
      // Whitelist fields to avoid unknown properties (e.g., walletAddress from interceptors)
      const {
        batchId,
        name,
        description,
        imageUrl,
        priceSol,
        priceUsdc,
        status,
        itemsAvailable,
        itemsOpened,
        metadataUris,
        updateTx,
      } = data || {} as UpdateBoxDTO;

      const updates: any = {};
      if (typeof batchId !== 'undefined') updates.batchId = batchId;
      if (typeof name !== 'undefined') updates.name = name;
      if (typeof description !== 'undefined') updates.description = description;
      if (typeof imageUrl !== 'undefined') updates.imageUrl = imageUrl;
      if (typeof priceSol !== 'undefined') updates.priceSol = priceSol;
      if (typeof priceUsdc !== 'undefined') updates.priceUsdc = priceUsdc;
      if (typeof status !== 'undefined') updates.status = status;
      if (typeof itemsAvailable !== 'undefined') updates.itemsAvailable = itemsAvailable;
      if (typeof itemsOpened !== 'undefined') updates.itemsOpened = itemsOpened;
      if (typeof metadataUris !== 'undefined') updates.metadataUris = metadataUris;
      if (typeof updateTx !== 'undefined') updates.updateTx = updateTx;

      const updated = await this.boxRepository.update(id, updates);
      if (!updated) {
        throw new AppError('Box not found', 404, 'BOX_NOT_FOUND');
      }

      logger.info('Box updated:', { id, updates: Object.keys(updates) });
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating box:', error);
      throw new AppError('Failed to update box', 500);
    }
  }

  async syncWithOnChain(batchId: number): Promise<any> {
    try {
      if (!this.solanaService) {
        this.solanaService = new SolanaService();
      }
      // Attempt a light call to ensure initialization
      try {
        await this.solanaService.getGlobalState();
      } catch (e: any) {
        throw new AppError('Solana service not initialized', 503, 'SOLANA_SERVICE_UNINITIALIZED');
      }
      
      // Get on-chain batch data
      const onChainBatch = await this.solanaService.getBatchState(batchId);
      if (!onChainBatch || !onChainBatch.data) {
        throw new AppError('Batch not found on-chain', 404, 'BATCH_NOT_FOUND');
      }

      // For now, since we're using raw account data, we'll just mark as synced
      // TODO: Parse the account data properly to get actual batch state
      
      // Debug: Check if box exists with this batchId
      const existingBox = await this.boxRepository.findByBatchId(batchId);
      logger.info('Looking for box with batchId:', { batchId, found: !!existingBox });
      
      const updated = await this.boxRepository.updateByBatchId(batchId, {
        isSynced: true,
        lastSyncedAt: new Date(),
        syncError: null,
      });

      if (!updated) {
        logger.error('Box not found for batchId:', { batchId });
        throw new AppError('Box not found in database', 404, 'BOX_NOT_FOUND');
      }

      logger.info('Box synced with on-chain state:', { batchId, totalItems: onChainBatch.totalItems });
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error syncing box with on-chain:', error);
      
      // Mark as unsynced
      await this.boxRepository.updateSyncStatus(batchId, false, (error as any).message);
      throw new AppError('Failed to sync box with on-chain state', 500);
    }
  }

  async syncAllBoxes(): Promise<{ synced: number; failed: number; errors: string[] }> {
    try {
      const boxes = await this.boxRepository.findAll();
      let synced = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const box of boxes) {
        try {
          await this.syncWithOnChain(box.batchId);
          synced++;
        } catch (error) {
          failed++;
          errors.push(`Batch ${box.batchId}: ${error.message}`);
        }
      }

      logger.info('Bulk sync completed:', { synced, failed, total: boxes.length });
      return { synced, failed, errors };
    } catch (error) {
      logger.error('Error in bulk sync:', error);
      throw new AppError('Failed to sync all boxes', 500);
    }
  }

  async deleteBox(id: string): Promise<void> {
    try {
      const box = await this.boxRepository.findById(id);
      if (!box) {
        throw new AppError('Box not found', 404, 'BOX_NOT_FOUND');
      }

      // Check if box has been opened
      if (box.itemsOpened > 0) {
        throw new AppError('Cannot delete box that has been opened', 400, 'BOX_HAS_OPENINGS');
      }

      const deleted = await this.boxRepository.delete(id);
      if (!deleted) {
        throw new AppError('Failed to delete box', 500);
      }

      logger.info('Box deleted:', { id, batchId: box.batchId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting box:', error);
      throw new AppError('Failed to delete box', 500);
    }
  }

  async getBoxStats(): Promise<any> {
    try {
      return await this.boxRepository.getStats();
    } catch (error) {
      logger.error('Error fetching box stats:', error);
      throw new AppError('Failed to fetch box statistics', 500);
    }
  }
}
