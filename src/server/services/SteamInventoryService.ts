import { AppDataSource } from '../config/database';
import { SteamInventory } from '../entities/SteamInventory';
import { getCS2Inventory, ParsedItem } from '../lib/steam/inventory';
import { logger } from '../middlewares/logger';

export class SteamInventoryService {
  private steamInventoryRepo = AppDataSource.getRepository(SteamInventory);

  async importInventory(
    userId: string,
    steamUserId: string,
    currency: string = 'USD',
    includePrices: boolean = true
  ) {
    try {
      logger.info(`Importing CS2 inventory for user ${userId}, steam: ${steamUserId}`);

      // Fetch inventory from Steam
      const result = await getCS2Inventory({
        userId: steamUserId,
        currency,
        includePrices,
      });

      // Delete existing inventory for this user+steamId64 combo
      await this.steamInventoryRepo.delete({
        userId,
        steamId64: result.steamId64,
      });

      // Save new inventory items
      const inventoryEntities = result.items.map((item: ParsedItem) => {
        const entity = new SteamInventory();
        entity.userId = userId;
        entity.steamId64 = result.steamId64;
        entity.steamUserId = steamUserId;
        entity.marketHashName = item.MarketHashName;
        entity.marketName = item.MarketName;
        entity.type = item.Type;
        entity.marketable = item.Marketable === 'Yes';
        entity.exterior = item.Exterior || undefined;
        entity.itemSet = item.ItemSet || undefined;
        entity.quality = item.Quality || undefined;
        entity.rarity = item.Rarity || undefined;
        entity.weapon = item.Weapon || undefined;
        entity.lowestPrice = item.LowestPrice || undefined;
        entity.medianPrice = item.MedianPrice || undefined;
        entity.volume = item.Volume || undefined;
        entity.currency = item.Currency || undefined;
        return entity;
      });

      await this.steamInventoryRepo.save(inventoryEntities);

      logger.info(`Successfully imported ${inventoryEntities.length} items`);

      return {
        steamId64: result.steamId64,
        itemCount: result.items.length,
        csvString: result.csvString,
        items: result.items,
      };
    } catch (error: any) {
      logger.error(`Error importing CS2 inventory: ${error.message}`);
      throw new Error(`Failed to import CS2 inventory: ${error.message}`);
    }
  }

  async getUserSteamInventory(userId: string, steamId64?: string) {
    const query = this.steamInventoryRepo
      .createQueryBuilder('inv')
      .where('inv.userId = :userId', { userId });

    if (steamId64) {
      query.andWhere('inv.steamId64 = :steamId64', { steamId64 });
    }

    const items = await query.orderBy('inv.importedAt', 'DESC').getMany();

    return items;
  }

  async getInventoryStats(userId: string) {
    const items = await this.getUserSteamInventory(userId);

    const totalItems = items.length;
    const marketableItems = items.filter((i) => i.marketable).length;
    
    // Calculate total value (parse price strings like "$1.23")
    const totalValue = items.reduce((sum, item) => {
      const price = item.lowestPrice?.replace(/[^0-9.]/g, '');
      return sum + (price ? parseFloat(price) : 0);
    }, 0);

    return {
      totalItems,
      marketableItems,
      totalValue,
      currency: items[0]?.currency || 'USD',
    };
  }
}

