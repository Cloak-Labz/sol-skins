import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { UserSkin } from '../entities/UserSkin';

export class UserSkinRepository {
  private repository: Repository<UserSkin>;

  constructor() {
    this.repository = AppDataSource.getRepository(UserSkin);
  }

  async findById(id: string): Promise<UserSkin | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'skinTemplate', 'lootBoxType'],
    });
  }

  async findByUser(userId: string, options?: {
    skip?: number;
    take?: number;
    search?: string;
    rarity?: string;
    sortBy?: string;
    inInventoryOnly?: boolean;
  }): Promise<[UserSkin[], number]> {
    const queryBuilder = this.repository.createQueryBuilder('userSkin')
      .leftJoinAndSelect('userSkin.skinTemplate', 'skinTemplate')
      .leftJoinAndSelect('userSkin.lootBoxType', 'lootBoxType')
      .where('userSkin.userId = :userId', { userId });

    if (options?.inInventoryOnly) {
      queryBuilder.andWhere('userSkin.isInInventory = :inInventory', { inInventory: true });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(skinTemplate.weapon ILIKE :search OR skinTemplate.skinName ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    if (options?.rarity && options.rarity !== 'all') {
      queryBuilder.andWhere('skinTemplate.rarity = :rarity', { rarity: options.rarity });
    }

    // Sorting
    switch (options?.sortBy) {
      case 'date':
        queryBuilder.orderBy('userSkin.openedAt', 'DESC');
        break;
      case 'price-high':
        queryBuilder.orderBy('userSkin.currentPriceUsd', 'DESC');
        break;
      case 'price-low':
        queryBuilder.orderBy('userSkin.currentPriceUsd', 'ASC');
        break;
      case 'name':
        queryBuilder.orderBy('skinTemplate.weapon', 'ASC').addOrderBy('skinTemplate.skinName', 'ASC');
        break;
      case 'rarity':
        queryBuilder.orderBy('skinTemplate.rarity', 'ASC');
        break;
      default:
        queryBuilder.orderBy('userSkin.openedAt', 'DESC');
    }

    if (options?.skip) {
      queryBuilder.skip(options.skip);
    }

    if (options?.take) {
      queryBuilder.take(options.take);
    }

    return queryBuilder.getManyAndCount();
  }

  async create(userSkinData: Partial<UserSkin>): Promise<UserSkin> {
    const userSkin = this.repository.create(userSkinData);
    return this.repository.save(userSkin);
  }

  async update(id: string, userSkinData: Partial<UserSkin>): Promise<void> {
    await this.repository.update(id, userSkinData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async markAsSold(id: string, buybackAmount: number): Promise<void> {
    await this.repository.update(id, {
      soldViaBuyback: true,
      isInInventory: false,
      buybackAmount,
      buybackAt: new Date(),
    });
  }

  async getUserInventoryValue(userId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('userSkin')
      .select('SUM(userSkin.currentPriceUsd)', 'totalValue')
      .where('userSkin.userId = :userId', { userId })
      .andWhere('userSkin.isInInventory = :inInventory', { inInventory: true })
      .getRawOne();

    return parseFloat(result.totalValue) || 0;
  }

  async getUserInventoryStats(userId: string): Promise<{
    totalValue: number;
    totalItems: number;
    rarityBreakdown: Record<string, number>;
  }> {
    const [userSkins] = await this.findByUser(userId, { inInventoryOnly: true });
    
    const totalValue = userSkins.reduce((sum, skin) => {
      const price = typeof skin.currentPriceUsd === 'string' 
        ? parseFloat(skin.currentPriceUsd) 
        : skin.currentPriceUsd;
      return sum + (price || 0);
    }, 0);
    const totalItems = userSkins.length;
    
    const rarityBreakdown = userSkins.reduce((acc, skin) => {
      const rarity = skin.skinTemplate?.rarity || 'unknown';
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalValue, totalItems, rarityBreakdown };
  }

  async findByNftMintAddress(nftMintAddress: string): Promise<UserSkin | null> {
    return this.repository.findOne({
      where: { nftMintAddress },
      relations: ['user', 'skinTemplate', 'lootBoxType'],
    });
  }
} 