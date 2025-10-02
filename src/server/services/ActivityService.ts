import { CaseOpeningRepository } from '../repositories/CaseOpeningRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { TransactionType, TransactionStatus } from '../entities/Transaction';

export class ActivityService {
  private caseOpeningRepository: CaseOpeningRepository;
  private transactionRepository: TransactionRepository;

  constructor() {
    this.caseOpeningRepository = new CaseOpeningRepository();
    this.transactionRepository = new TransactionRepository();
  }

  async getRecentActivity(options: {
    limit?: number;
    type?: 'all' | 'case_opened' | 'buyback';
  }) {
    const limit = Math.min(options.limit || 50, 100);

    // Get recent completed case openings
    const recentOpenings = await this.caseOpeningRepository.getRecentActivity(limit);

    const activities = recentOpenings
      .filter(opening => opening.completedAt && opening.skinTemplate && opening.user)
      .map(opening => ({
        id: opening.id,
        type: 'case_opened' as const,
        user: {
          id: opening.user!.id,
          username: opening.user!.username || `User${opening.user!.id.slice(0, 8)}`,
          walletAddress: opening.user!.walletAddress.slice(0, 8) + '...',
        },
        skin: {
          id: opening.skinTemplate!.id,
          weapon: opening.skinTemplate!.weapon,
          skinName: opening.skinTemplate!.skinName,
          rarity: opening.skinTemplate!.rarity,
          condition: opening.skinTemplate!.condition,
          imageUrl: opening.skinTemplate!.imageUrl,
          valueUsd: opening.userSkin?.currentPriceUsd || opening.skinTemplate!.basePriceUsd,
        },
        lootBox: {
          id: opening.lootBoxType!.id,
          name: opening.lootBoxType!.name,
          rarity: opening.lootBoxType!.rarity,
        },
        timestamp: opening.completedAt!,
      }));

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  }

  async getActivityStats() {
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const last7d = new Date();
    last7d.setDate(last7d.getDate() - 7);

    const last30d = new Date();
    last30d.setDate(last30d.getDate() - 30);

    const [
      stats24h,
      stats7d,
      stats30d,
      allTimeStats,
    ] = await Promise.all([
      this.caseOpeningRepository.getOpeningStats(1),
      this.caseOpeningRepository.getOpeningStats(7),
      this.caseOpeningRepository.getOpeningStats(30),
      this.caseOpeningRepository.getOpeningStats(),
    ]);

    return {
      last24h: {
        casesOpened: stats24h.totalOpened,
        successfulOpenings: stats24h.successfulOpenings,
      },
      last7d: {
        casesOpened: stats7d.totalOpened,
        successfulOpenings: stats7d.successfulOpenings,
      },
      last30d: {
        casesOpened: stats30d.totalOpened,
        successfulOpenings: stats30d.successfulOpenings,
      },
      allTime: {
        casesOpened: allTimeStats.totalOpened,
        successfulOpenings: allTimeStats.successfulOpenings,
        pendingOpenings: allTimeStats.pendingOpenings,
      },
    };
  }
} 