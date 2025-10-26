import { InventoryRepository } from '../repositories/InventoryRepository';
import { Inventory } from '../entities/Inventory';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../middlewares/logger';

export interface CreateInventoryDTO {
  name: string;
  description?: string;
  imageUrl: string;
  rarity?: string;
  attributes?: Record<string, any>;
  metadataUri?: string;
  mintedAsset?: string;
  mintTx?: string;
}

export interface UpdateInventoryDTO {
  name?: string;
  description?: string;
  imageUrl?: string;
  rarity?: string;
  attributes?: Record<string, any>;
  metadataUri?: string;
  mintedAsset?: string;
  mintTx?: string;
  mintedAt?: Date;
}

export class MintedNFTService {
  private repository: InventoryRepository;

  constructor() {
    this.repository = new InventoryRepository();
  }

  async getAllInventory(): Promise<Inventory[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      logger.error('Error fetching all inventory:', error);
      throw new AppError('Failed to fetch inventory', 500);
    }
  }

  async getInventoryById(id: string): Promise<Inventory> {
    try {
      const inventory = await this.repository.findById(id);
      if (!inventory) {
        throw new AppError('Inventory item not found', 404, 'INVENTORY_NOT_FOUND');
      }
      return inventory;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching inventory by ID:', error);
      throw new AppError('Failed to fetch inventory item', 500);
    }
  }

  async getAvailableForBatch(): Promise<Inventory[]> {
    try {
      return await this.repository.findAvailableForBatch();
    } catch (error) {
      logger.error('Error fetching available inventory:', error);
      throw new AppError('Failed to fetch available inventory', 500);
    }
  }

  async searchInventory(query: string): Promise<Inventory[]> {
    try {
      return await this.repository.search(query);
    } catch (error) {
      logger.error('Error searching inventory:', error);
      throw new AppError('Failed to search inventory', 500);
    }
  }

  async createInventory(data: CreateInventoryDTO): Promise<Inventory> {
    try {
      // Check if mintedAsset already exists
      if (data.mintedAsset) {
        const existing = await this.repository.findByMintedAsset(data.mintedAsset);
        if (existing) {
          throw new AppError(
            'NFT with this minted asset already exists',
            409,
            'DUPLICATE_ASSET'
          );
        }
      }

      const inventory = await this.repository.create({
        ...data,
        rarity: data.rarity || 'Common',
        assignedToBatch: false,
        mintedAt: data.mintedAsset ? new Date() : undefined,
      });

      logger.info('Inventory item created:', { id: inventory.id, name: inventory.name });
      return inventory;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating inventory:', error);
      throw new AppError('Failed to create inventory item', 500);
    }
  }

  async updateInventory(id: string, data: UpdateInventoryDTO): Promise<Inventory> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new AppError('Inventory item not found', 404, 'INVENTORY_NOT_FOUND');
      }

      // If updating mintedAsset, check for duplicates
      if (data.mintedAsset && data.mintedAsset !== existing.mintedAsset) {
        const duplicate = await this.repository.findByMintedAsset(data.mintedAsset);
        if (duplicate) {
          throw new AppError(
            'Another NFT with this minted asset already exists',
            409,
            'DUPLICATE_ASSET'
          );
        }
      }

      const updated = await this.repository.update(id, data);
      if (!updated) {
        throw new AppError('Failed to update inventory item', 500);
      }

      logger.info('Inventory item updated:', { id, name: updated.name });
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating inventory:', error);
      throw new AppError('Failed to update inventory item', 500);
    }
  }

  async updateMintInfo(
    id: string,
    metadataUri: string,
    mintedAsset: string,
    mintTx: string
  ): Promise<Inventory> {
    try {
      return await this.updateInventory(id, {
        metadataUri,
        mintedAsset,
        mintTx,
        mintedAt: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating mint info:', error);
      throw new AppError('Failed to update mint information', 500);
    }
  }

  async assignToBatch(inventoryIds: string[], batchId: number): Promise<void> {
    try {
      await this.repository.assignToBatch(inventoryIds, batchId);
      logger.info('Inventory items assigned to batch:', {
        count: inventoryIds.length,
        batchId,
      });
    } catch (error) {
      logger.error('Error assigning inventory to batch:', error);
      throw new AppError('Failed to assign inventory to batch', 500);
    }
  }

  async unassignFromBatch(batchId: number): Promise<void> {
    try {
      await this.repository.unassignFromBatch(batchId);
      logger.info('Inventory items unassigned from batch:', { batchId });
    } catch (error) {
      logger.error('Error unassigning inventory from batch:', error);
      throw new AppError('Failed to unassign inventory from batch', 500);
    }
  }

  async deleteInventory(id: string): Promise<void> {
    try {
      const inventory = await this.repository.findById(id);
      if (!inventory) {
        throw new AppError('Inventory item not found', 404, 'INVENTORY_NOT_FOUND');
      }

      if (inventory.assignedToBatch) {
        throw new AppError(
          'Cannot delete inventory item assigned to a batch',
          400,
          'ITEM_ASSIGNED'
        );
      }

      const deleted = await this.repository.delete(id);
      if (!deleted) {
        throw new AppError('Failed to delete inventory item', 500);
      }

      logger.info('Inventory item deleted:', { id });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting inventory:', error);
      throw new AppError('Failed to delete inventory item', 500);
    }
  }

  async getInventoryStats(): Promise<{
    total: number;
    available: number;
    assigned: number;
    byRarity: Record<string, number>;
  }> {
    try {
      const all = await this.repository.findAll();
      const byRarity = await this.repository.countByRarity();

      return {
        total: all.length,
        available: all.filter((i) => !i.assignedToBatch).length,
        assigned: all.filter((i) => i.assignedToBatch).length,
        byRarity,
      };
    } catch (error) {
      logger.error('Error fetching inventory stats:', error);
      throw new AppError('Failed to fetch inventory statistics', 500);
    }
  }
}
