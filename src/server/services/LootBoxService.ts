import { LootBoxTypeRepository } from '../repositories/LootBoxTypeRepository';
import { LootBoxType } from '../entities/LootBoxType';
import { AppError } from '../middlewares/errorHandler';

export class LootBoxService {
  private lootBoxRepository: LootBoxTypeRepository;

  constructor() {
    this.lootBoxRepository = new LootBoxTypeRepository();
  }

  async getAllLootBoxes(options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    filterBy?: string;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    const [lootBoxes, total] = await this.lootBoxRepository.findAll({
      skip,
      take: limit,
      search: options.search,
      filterBy: options.filterBy,
      sortBy: options.sortBy,
      isActive: true,
    });

    // Transform to include chance breakdown and supply info
    const transformedLootBoxes = lootBoxes.map(lootBox => ({
      id: lootBox.id,
      name: lootBox.name,
      description: lootBox.description,
      priceSol: lootBox.priceSol,
      priceUsdc: lootBox.priceUsdc,
      imageUrl: lootBox.imageUrl,
      rarity: lootBox.rarity,
      isActive: lootBox.isActive,
      isFeatured: lootBox.isFeatured,
      chances: {
        common: lootBox.chanceCommon,
        uncommon: lootBox.chanceUncommon,
        rare: lootBox.chanceRare,
        epic: lootBox.chanceEpic,
        legendary: lootBox.chanceLegendary,
      },
      supply: {
        maxSupply: lootBox.maxSupply,
        remainingSupply: lootBox.remainingSupply,
        isSoldOut: lootBox.maxSupply ? lootBox.remainingSupply <= 0 : false,
      },
      createdAt: lootBox.createdAt,
      updatedAt: lootBox.updatedAt,
    }));

    return {
      data: transformedLootBoxes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLootBoxById(id: string) {
    const lootBox = await this.lootBoxRepository.findById(id);
    
    if (!lootBox) {
      throw new AppError('Loot box not found', 404, 'LOOT_BOX_NOT_FOUND');
    }

    if (!lootBox.isActive) {
      throw new AppError('Loot box is not available', 404, 'LOOT_BOX_NOT_AVAILABLE');
    }

    // Get possible skins from skin pools
    const possibleSkins = lootBox.skinPools?.map(pool => ({
      id: pool.skinTemplate.id,
      weapon: pool.skinTemplate.weapon,
      skinName: pool.skinTemplate.skinName,
      rarity: pool.skinTemplate.rarity,
      condition: pool.skinTemplate.condition,
      basePriceUsd: pool.skinTemplate.basePriceUsd,
      imageUrl: pool.skinTemplate.imageUrl,
      weight: pool.weight,
    })) || [];

    return {
      id: lootBox.id,
      name: lootBox.name,
      description: lootBox.description,
      priceSol: lootBox.priceSol,
      priceUsdc: lootBox.priceUsdc,
      imageUrl: lootBox.imageUrl,
      rarity: lootBox.rarity,
      chances: {
        common: lootBox.chanceCommon,
        uncommon: lootBox.chanceUncommon,
        rare: lootBox.chanceRare,
        epic: lootBox.chanceEpic,
        legendary: lootBox.chanceLegendary,
      },
      supply: {
        maxSupply: lootBox.maxSupply,
        remainingSupply: lootBox.remainingSupply,
        isSoldOut: lootBox.maxSupply ? lootBox.remainingSupply <= 0 : false,
      },
      possibleSkins,
      createdAt: lootBox.createdAt,
      updatedAt: lootBox.updatedAt,
    };
  }

  async createLootBox(data: {
    name: string;
    description?: string;
    priceSol: number;
    priceUsdc?: number;
    imageUrl?: string;
    rarity: string;
    isFeatured?: boolean;
    chanceCommon?: number;
    chanceUncommon?: number;
    chanceRare?: number;
    chanceEpic?: number;
    chanceLegendary?: number;
    maxSupply?: number;
  }): Promise<LootBoxType> {
    // Validate that chances add up to 100%
    const totalChances = (data.chanceCommon || 0) + 
                        (data.chanceUncommon || 0) + 
                        (data.chanceRare || 0) + 
                        (data.chanceEpic || 0) + 
                        (data.chanceLegendary || 0);
    
    if (Math.abs(totalChances - 100) > 0.01) {
      throw new AppError('Drop chances must add up to 100%', 400, 'INVALID_CHANCES');
    }

    return this.lootBoxRepository.create({
      ...data,
      rarity: data.rarity as any,
      isActive: true,
      chanceCommon: data.chanceCommon || 0,
      chanceUncommon: data.chanceUncommon || 0,
      chanceRare: data.chanceRare || 0,
      chanceEpic: data.chanceEpic || 0,
      chanceLegendary: data.chanceLegendary || 0,
      maxSupply: data.maxSupply,
      remainingSupply: data.maxSupply || 0,
    });
  }

  async updateLootBox(id: string, data: Partial<LootBoxType>): Promise<void> {
    const lootBox = await this.lootBoxRepository.findById(id);
    
    if (!lootBox) {
      throw new AppError('Loot box not found', 404, 'LOOT_BOX_NOT_FOUND');
    }

    await this.lootBoxRepository.update(id, data);
  }

  async deleteLootBox(id: string): Promise<void> {
    const lootBox = await this.lootBoxRepository.findById(id);
    
    if (!lootBox) {
      throw new AppError('Loot box not found', 404, 'LOOT_BOX_NOT_FOUND');
    }

    // Soft delete by setting isActive to false
    await this.lootBoxRepository.update(id, { isActive: false });
  }

  async getFeaturedLootBoxes(limit: number = 5) {
    return this.lootBoxRepository.findFeatured(limit);
  }
} 