import { UserRepository } from '../repositories/UserRepository';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { CaseOpeningRepository } from '../repositories/CaseOpeningRepository';
import { LootBoxTypeRepository } from '../repositories/LootBoxTypeRepository';

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
}
