import { UserRepository } from '../repositories/UserRepository';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AppError } from '../middlewares/errorHandler';

export class LeaderboardService {
  private userRepository: UserRepository;
  private userSkinRepository: UserSkinRepository;
  private transactionRepository: TransactionRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.userSkinRepository = new UserSkinRepository();
    this.transactionRepository = new TransactionRepository();
  }

  async getLeaderboard(options: {
    period?: 'all-time' | 'monthly' | 'weekly';
    metric?: 'inventory-value' | 'cases-opened' | 'profit' | 'points';
    limit?: number;
  }) {
    const limit = Math.min(options.limit || 100, 500); // Max 500 users

    // For this implementation, we'll focus on inventory-value leaderboard
    // In a real implementation, you'd have more complex queries for different periods and metrics
    
    // Fetch ALL users first (or at least enough to get accurate top N)
    // We need to fetch all users, sort them, then limit to get accurate top rankings
    const [allUsers] = await this.userRepository.findAll({
      take: 1000, // Fetch more users to ensure accurate sorting
    });

    const leaderboardData = await Promise.all(
      allUsers.map(async (user) => {
        const inventoryValue = await this.userSkinRepository.getUserInventoryValue(user.id);
        const transactionSummary = await this.transactionRepository.getUserTransactionSummary(user.id);

        return {
          rank: 0, // Will be set after sorting
          user: {
            id: user.id,
            username: user.username || `User${user.id.slice(0, 8)}`,
            walletAddress: user.walletAddress,
          },
          inventoryValue,
          casesOpened: user.casesOpened || 0,
          totalSpent: parseFloat(user.totalSpent.toString()),
          totalEarned: parseFloat(user.totalEarned.toString()),
          netProfit: parseFloat(user.totalEarned.toString()) - parseFloat(user.totalSpent.toString()),
        };
      })
    );

    // Sort by the requested metric
    switch (options.metric) {
      case 'points':
        // Points = casesOpened * 3
        leaderboardData.sort((a, b) => (b.casesOpened * 3) - (a.casesOpened * 3));
        break;
      case 'cases-opened':
        leaderboardData.sort((a, b) => b.casesOpened - a.casesOpened);
        break;
      case 'profit':
        leaderboardData.sort((a, b) => b.netProfit - a.netProfit);
        break;
      case 'inventory-value':
      default:
        leaderboardData.sort((a, b) => b.inventoryValue - a.inventoryValue);
    }

    // Update ranks after sorting
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Now limit to the requested number
    return leaderboardData.slice(0, limit);
  }

  async getUserRank(userId: string, metric: 'inventory-value' | 'cases-opened' | 'profit' | 'points' = 'points') {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get all leaderboard data to find user rank
    const leaderboard = await this.getLeaderboard({ metric, limit: 500 });
    const userEntry = leaderboard.find(entry => entry.user.id === userId);

    if (!userEntry) {
      return {
        rank: 0,
        totalUsers: leaderboard.length,
        percentile: 0,
        metric,
        value: 0,
      };
    }

    const percentile = Math.round((1 - (userEntry.rank - 1) / leaderboard.length) * 100);

    // Get the value based on the metric
    let value = 0;
    switch (metric) {
      case 'points':
        value = userEntry.casesOpened * 3;
        break;
      case 'inventory-value':
        value = userEntry.inventoryValue;
        break;
      case 'cases-opened':
        value = userEntry.casesOpened;
        break;
      case 'profit':
        value = userEntry.netProfit;
        break;
    }

    return {
      rank: userEntry.rank,
      totalUsers: leaderboard.length,
      percentile,
      metric,
      value,
    };
  }
} 