import { UserRepository } from '../repositories/UserRepository';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { CaseOpeningRepository } from '../repositories/CaseOpeningRepository';
import { LootBoxTypeRepository } from '../repositories/LootBoxTypeRepository';
import { AppError } from '../middlewares/errorHandler';

export class AdminService {
  private userRepository: UserRepository;
  private userSkinRepository: UserSkinRepository;
  private transactionRepository: TransactionRepository;
  private caseOpeningRepository: CaseOpeningRepository;
  private lootBoxRepository: LootBoxTypeRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.userSkinRepository = new UserSkinRepository();
    this.transactionRepository = new TransactionRepository();
    this.caseOpeningRepository = new CaseOpeningRepository();
    this.lootBoxRepository = new LootBoxTypeRepository();
  }

  async getOverviewStats() {
    const [
      totalUsers,
      active30dUsers,
      active7dUsers,
      revenue30d,
      revenueAllTime,
      cases30d,
      casesAllTime,
    ] = await Promise.all([
      this.userRepository.getTotalUsersCount(),
      this.userRepository.getActiveUsersCount(30),
      this.userRepository.getActiveUsersCount(7),
      this.transactionRepository.getRevenueStats(30),
      this.transactionRepository.getRevenueStats(),
      this.caseOpeningRepository.getOpeningStats(30),
      this.caseOpeningRepository.getOpeningStats(),
    ]);

    // Calculate total NFT value (this would be expensive in production, consider caching)
    const [users] = await this.userRepository.findAll({ take: 1000 });
    let totalNfts = 0;
    let totalValueUsd = 0;
    let buybacksSold = 0;

    for (const user of users) {
      const inventoryValue = await this.userSkinRepository.getUserInventoryValue(user.id);
      const [userSkins] = await this.userSkinRepository.findByUser(user.id, { take: 1000 });
      
      totalNfts += userSkins.filter(skin => skin.isInInventory).length;
      totalValueUsd += inventoryValue;
      buybacksSold += userSkins.filter(skin => skin.soldViaBuyback).length;
    }

    return {
      users: {
        total: totalUsers,
        active30d: active30dUsers,
        active7d: active7dUsers,
      },
      revenue: {
        totalSol: revenueAllTime.totalSol,
        totalUsd: revenueAllTime.totalUsd,
        last30dSol: revenue30d.totalSol,
        last30dUsd: revenue30d.totalUsd,
      },
      cases: {
        totalOpened: casesAllTime.totalOpened,
        last30d: cases30d.totalOpened,
        last7d: cases30d.totalOpened, // This should be calculated separately for 7d
      },
      inventory: {
        totalNfts,
        totalValueUsd,
        buybacksSold,
      },
    };
  }

  async getUsersStats(options: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'totalSpent' | 'totalEarned' | 'casesOpened';
    order?: 'ASC' | 'DESC';
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 200);
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAll({
      skip,
      take: limit,
    });

    const userStats = await Promise.all(
      users.map(async (user) => {
        const inventoryValue = await this.userSkinRepository.getUserInventoryValue(user.id);
        const transactionSummary = await this.transactionRepository.getUserTransactionSummary(user.id);

        return {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          email: user.email,
          isActive: user.isActive,
          totalSpent: user.totalSpent,
          totalEarned: user.totalEarned,
          casesOpened: user.casesOpened,
          inventoryValue,
          netProfit: user.totalEarned - user.totalSpent,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        };
      })
    );

    // Sort by requested field
    if (options.sortBy) {
      userStats.sort((a, b) => {
        const aValue = a[options.sortBy!];
        const bValue = b[options.sortBy!];
        
        if (options.order === 'ASC') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return {
      users: userStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionStats(days?: number) {
    return this.transactionRepository.getRevenueStats(days);
  }

  async getCaseOpeningStats(days?: number) {
    return this.caseOpeningRepository.getOpeningStats(days);
  }

  async getUserById(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    const inventoryValue = await this.userSkinRepository.getUserInventoryValue(user.id);
    const transactionSummary = await this.transactionRepository.getUserTransactionSummary(user.id);
    const [userSkins] = await this.userSkinRepository.findByUser(user.id, { take: 10 });

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      email: user.email,
      tradeUrl: user.tradeUrl,
      isActive: user.isActive,
      totalSpent: user.totalSpent,
      totalEarned: user.totalEarned,
      casesOpened: user.casesOpened,
      inventoryValue,
      inventoryCount: userSkins.filter(s => s.isInInventory).length,
      waitingTransferCount: userSkins.filter(s => s.isWaitingTransfer).length,
      transactionSummary,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }

  async getUserInventory(
    userId: string,
    options: {
      page: number;
      limit: number;
      filterBy?: string;
      search?: string;
      sortBy?: string;
      order?: 'ASC' | 'DESC';
    }
  ) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 200);
    const skip = (page - 1) * limit;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Access the repository through AppDataSource to use query builder
    const { AppDataSource } = require('../config/database');
    const { UserSkin } = require('../entities/UserSkin');
    const userSkinRepo = AppDataSource.getRepository(UserSkin);
    
    const queryBuilder = userSkinRepo
      .createQueryBuilder('userSkin')
      .leftJoinAndSelect('userSkin.skinTemplate', 'skinTemplate')
      .leftJoinAndSelect('userSkin.lootBoxType', 'lootBoxType')
      .where('userSkin.userId = :userId', { userId })
      .skip(skip)
      .take(limit);

    // Filter by status
    if (options.filterBy) {
      switch (options.filterBy) {
        case 'inventory':
          queryBuilder.andWhere('userSkin.isInInventory = :inInventory', { inInventory: true });
          break;
        case 'waiting-transfer':
          queryBuilder.andWhere('userSkin.isWaitingTransfer = :waiting', { waiting: true });
          break;
        case 'sold':
          queryBuilder.andWhere('userSkin.soldViaBuyback = :sold', { sold: true });
          break;
        case 'claimed':
          queryBuilder.andWhere('userSkin.isInInventory = :inInventory', { inInventory: false })
            .andWhere('userSkin.soldViaBuyback = :sold', { sold: false });
          break;
      }
    }

    // Search
    if (options.search) {
      queryBuilder.andWhere(
        '(userSkin.name ILIKE :search OR skinTemplate.weapon ILIKE :search OR skinTemplate.skinName ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    // Sort
    switch (options.sortBy) {
      case 'openedAt':
        queryBuilder.orderBy('userSkin.openedAt', options.order || 'DESC');
        break;
      case 'price':
        queryBuilder.orderBy('userSkin.currentPriceUsd', options.order || 'DESC');
        break;
      case 'name':
        queryBuilder.orderBy('userSkin.name', options.order || 'ASC');
        break;
      case 'createdAt':
        queryBuilder.orderBy('userSkin.createdAt', options.order || 'DESC');
        break;
      default:
        queryBuilder.orderBy('userSkin.openedAt', options.order || 'DESC');
    }

    const [skins, total] = await queryBuilder.getManyAndCount();

    return {
      skins: skins.map(skin => ({
        id: skin.id,
        nftMintAddress: skin.nftMintAddress,
        name: skin.name,
        imageUrl: skin.imageUrl,
        currentPriceUsd: skin.currentPriceUsd,
        isInInventory: skin.isInInventory,
        isWaitingTransfer: skin.isWaitingTransfer,
        soldViaBuyback: skin.soldViaBuyback,
        openedAt: skin.openedAt,
        createdAt: skin.createdAt,
        skinTemplate: skin.skinTemplate ? {
          id: skin.skinTemplate.id,
          weapon: skin.skinTemplate.weapon,
          skinName: skin.skinTemplate.skinName,
          rarity: skin.skinTemplate.rarity,
        } : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSkinsWaitingTransfer(options: { page: number; limit: number }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 200);
    const skip = (page - 1) * limit;

    // Access the repository through AppDataSource to use query builder
    const { AppDataSource } = require('../config/database');
    const { UserSkin } = require('../entities/UserSkin');
    const userSkinRepo = AppDataSource.getRepository(UserSkin);
    
    const queryBuilder = userSkinRepo
      .createQueryBuilder('userSkin')
      .leftJoinAndSelect('userSkin.user', 'user')
      .leftJoinAndSelect('userSkin.skinTemplate', 'skinTemplate')
      .where('userSkin.isWaitingTransfer = :waiting', { waiting: true })
      .andWhere('userSkin.isInInventory = :inInventory', { inInventory: true })
      .skip(skip)
      .take(limit)
      .orderBy('userSkin.createdAt', 'DESC');

    const [skins, total] = await queryBuilder.getManyAndCount();

    return {
      skins: skins.map(skin => ({
        id: skin.id,
        nftMintAddress: skin.nftMintAddress,
        name: skin.name,
        imageUrl: skin.imageUrl,
        currentPriceUsd: skin.currentPriceUsd,
        openedAt: skin.openedAt,
        createdAt: skin.createdAt,
        user: {
          id: skin.user?.id,
          walletAddress: skin.user?.walletAddress,
          username: skin.user?.username,
          tradeUrl: skin.user?.tradeUrl,
        },
        skinTemplate: skin.skinTemplate ? {
          id: skin.skinTemplate.id,
          weapon: skin.skinTemplate.weapon,
          skinName: skin.skinTemplate.skinName,
          rarity: skin.skinTemplate.rarity,
        } : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateSkinStatus(
    skinId: string,
    updates: {
      isWaitingTransfer?: boolean;
      isInInventory?: boolean;
      soldViaBuyback?: boolean;
    }
  ) {
    const skin = await this.userSkinRepository.findById(skinId);
    if (!skin) return null;

    const updateData: any = {};
    if (updates.isWaitingTransfer !== undefined) {
      updateData.isWaitingTransfer = updates.isWaitingTransfer;
    }
    if (updates.isInInventory !== undefined) {
      updateData.isInInventory = updates.isInInventory;
    }
    if (updates.soldViaBuyback !== undefined) {
      updateData.soldViaBuyback = updates.soldViaBuyback;
    }

    await this.userSkinRepository.update(skinId, updateData);
    
    return await this.userSkinRepository.findById(skinId);
  }
}
