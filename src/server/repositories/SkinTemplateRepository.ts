import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SkinTemplate } from '../entities/SkinTemplate';

export class SkinTemplateRepository {
  private repository: Repository<SkinTemplate>;

  constructor() {
    this.repository = AppDataSource.getRepository(SkinTemplate);
  }

  async findById(id: string): Promise<SkinTemplate | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    search?: string;
    weapon?: string;
    rarity?: string;
    condition?: string;
    isActive?: boolean;
  }): Promise<[SkinTemplate[], number]> {
    const queryBuilder = this.repository.createQueryBuilder('skin');
    
    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('skin.isActive = :isActive', { isActive: options.isActive });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(skin.weapon ILIKE :search OR skin.skinName ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    if (options?.weapon) {
      queryBuilder.andWhere('skin.weapon = :weapon', { weapon: options.weapon });
    }

    if (options?.rarity) {
      queryBuilder.andWhere('skin.rarity = :rarity', { rarity: options.rarity });
    }

    if (options?.condition) {
      queryBuilder.andWhere('skin.condition = :condition', { condition: options.condition });
    }

    queryBuilder.orderBy('skin.weapon', 'ASC').addOrderBy('skin.skinName', 'ASC');

    if (options?.skip) {
      queryBuilder.skip(options.skip);
    }

    if (options?.take) {
      queryBuilder.take(options.take);
    }

    return queryBuilder.getManyAndCount();
  }

  async create(skinData: Partial<SkinTemplate>): Promise<SkinTemplate> {
    const skin = this.repository.create(skinData);
    return this.repository.save(skin);
  }

  async update(id: string, skinData: Partial<SkinTemplate>): Promise<void> {
    await this.repository.update(id, skinData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findByWeaponAndSkin(weapon: string, skinName: string, condition: string): Promise<SkinTemplate | null> {
    return this.repository.findOne({
      where: { weapon, skinName, condition: condition as any },
    });
  }

  async findByRarity(rarity: string): Promise<SkinTemplate[]> {
    return this.repository.find({
      where: { rarity: rarity as any, isActive: true },
      order: { basePriceUsd: 'DESC' },
    });
  }

  async updatePrice(id: string, newPrice: number): Promise<void> {
    await this.repository.update(id, { basePriceUsd: newPrice });
  }
} 