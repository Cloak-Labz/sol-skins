import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { LootBoxType } from '../entities/LootBoxType';

export class LootBoxTypeRepository {
  private repository: Repository<LootBoxType>;

  constructor() {
    this.repository = AppDataSource.getRepository(LootBoxType);
  }

  async findById(id: string): Promise<LootBoxType | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['skinPools', 'skinPools.skinTemplate'],
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    search?: string;
    filterBy?: string;
    sortBy?: string;
    isActive?: boolean;
  }): Promise<[LootBoxType[], number]> {
    const queryBuilder = this.repository.createQueryBuilder('lootBox');
    
    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('lootBox.isActive = :isActive', { isActive: options.isActive });
    }

    if (options?.search) {
      queryBuilder.andWhere('lootBox.name ILIKE :search', { search: `%${options.search}%` });
    }

    if (options?.filterBy && options.filterBy !== 'all') {
      queryBuilder.andWhere('lootBox.rarity = :rarity', { rarity: options.filterBy });
    }

    // Sorting
    switch (options?.sortBy) {
      case 'featured':
        queryBuilder.orderBy('lootBox.isFeatured', 'DESC').addOrderBy('lootBox.name', 'ASC');
        break;
      case 'price-low':
        queryBuilder.orderBy('lootBox.priceSol', 'ASC');
        break;
      case 'price-high':
        queryBuilder.orderBy('lootBox.priceSol', 'DESC');
        break;
      case 'name':
        queryBuilder.orderBy('lootBox.name', 'ASC');
        break;
      default:
        queryBuilder.orderBy('lootBox.isFeatured', 'DESC').addOrderBy('lootBox.createdAt', 'DESC');
    }

    if (options?.skip) {
      queryBuilder.skip(options.skip);
    }

    if (options?.take) {
      queryBuilder.take(options.take);
    }

    return queryBuilder.getManyAndCount();
  }

  async create(lootBoxData: Partial<LootBoxType>): Promise<LootBoxType> {
    const lootBox = this.repository.create(lootBoxData);
    return this.repository.save(lootBox);
  }

  async update(id: string, lootBoxData: Partial<LootBoxType>): Promise<void> {
    await this.repository.update(id, lootBoxData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findFeatured(limit: number = 5): Promise<LootBoxType[]> {
    return this.repository.find({
      where: { isFeatured: true, isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findActive(): Promise<LootBoxType[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { isFeatured: 'DESC', name: 'ASC' },
    });
  }

  async decrementSupply(id: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(LootBoxType)
      .set({ 
        remainingSupply: () => 'GREATEST(remainingSupply - 1, 0)' 
      })
      .where('id = :id', { id })
      .andWhere('remainingSupply > 0')
      .execute();
  }
} 