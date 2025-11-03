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
    type?: 'all' | 'case_opened' | 'buyback' | 'skin_claimed' | 'payout';
  }) {
    const limit = Math.min(options.limit || 50, 100);

    // Get recent completed case openings
    const recentOpenings = await this.caseOpeningRepository.getRecentActivity(limit);

    // Get recent transactions for payouts and skin claims
    const [payoutTransactions, skinClaimTransactions] = await Promise.all([
      this.transactionRepository.findAll({
        type: 'payout',
        limit: limit,
        sortBy: 'createdAt'
      }),
      this.transactionRepository.findAll({
        type: 'skin_claimed', 
        limit: limit,
        sortBy: 'createdAt'
      })
    ]);
    
    // Filter by confirmed status and combine
    const recentTransactions = [...payoutTransactions[0], ...skinClaimTransactions[0]]
      .filter(transaction => transaction.status === TransactionStatus.CONFIRMED)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const caseOpeningActivities = recentOpenings
      .filter(opening => opening.completedAt && opening.user)
      .map(opening => {
        // Handle both case openings and pack openings
        const isPackOpening = opening.isPackOpening;
        
        if (isPackOpening) {
          // Pack opening data - fix weapon name duplication
          const skinName = opening.skinName || 'Unknown';
          const weapon = opening.skinWeapon || 'Unknown';
          
          // If skinName already contains the weapon, use it as-is, otherwise combine them
          let displaySkinName = skinName;
          if (!skinName.includes(weapon)) {
            displaySkinName = `${weapon} | ${skinName}`;
          }
          
          return {
            id: opening.id,
            type: 'case_opened' as const,
            user: {
              id: opening.user!.id,
              username: opening.user!.username || `User${opening.user!.id.slice(0, 8)}`,
              walletAddress: opening.user!.walletAddress.slice(0, 8) + '...',
            },
            skin: {
              id: opening.nftMintAddress || opening.id,
              weapon: weapon,
              skinName: displaySkinName,
              rarity: opening.skinRarity || 'Common',
              condition: 'Field-Tested', // Default for pack openings
              imageUrl: opening.skinImage || '',
              valueUsd: opening.boxPriceSol || 0, // Use box price for pack openings
            },
            lootBox: {
              id: opening.lootBoxTypeId,
              name: 'Pack', // Default name for pack openings
              rarity: 'Common', // Default rarity
            },
            amount: {
              sol: opening.boxPriceSol || 0, // SOL amount for pack openings
              usd: 0, // Will be calculated on frontend
            },
            timestamp: opening.completedAt!,
          };
        } else {
          // Case opening data (existing logic)
          return {
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
            amount: {
              sol: opening.lootBoxType?.priceSol || 0, // SOL amount for case openings
              usd: 0, // Will be calculated on frontend
            },
            timestamp: opening.completedAt!,
          };
        }
      });

    // Map transaction activities
    const transactionActivities = recentTransactions
      .filter(transaction => transaction.user)
      .map(transaction => {
        if (transaction.transactionType === 'payout') {
          return {
            id: transaction.id,
            type: 'payout' as const,
            user: {
              id: transaction.user!.id,
              username: transaction.user!.username || `User${transaction.user!.id.slice(0, 8)}`,
              walletAddress: transaction.user!.walletAddress.slice(0, 8) + '...',
            },
            skin: transaction.userSkin ? {
              id: transaction.userSkin.id,
              weapon: transaction.userSkin.name?.split(' | ')[0] || 'Unknown',
              skinName: transaction.userSkin.name || 'Unknown Skin',
              rarity: transaction.userSkin.skinTemplate?.rarity || 'Unknown',
              condition: transaction.userSkin.condition || 'Unknown',
              imageUrl: transaction.userSkin.imageUrl || '',
              valueUsd: transaction.userSkin.currentPriceUsd?.toString() || '0',
            } : undefined,
            amount: {
              sol: parseFloat(transaction.amountSol?.toString() || '0'),
              usd: parseFloat(transaction.amountUsd?.toString() || '0'),
            },
            timestamp: transaction.confirmedAt || transaction.createdAt,
          };
                } else if (transaction.transactionType === 'skin_claimed') {
                  // Parse metadata for skin claimed activities
                  let skinData = {
                    weapon: 'Unknown',
                    skinName: 'Claimed Skin',
                    rarity: 'Unknown',
                    condition: 'Unknown',
                    imageUrl: '',
                    valueUsd: '0',
                  };

                  if (transaction.metadata) {
                    try {
                      const metadata = JSON.parse(transaction.metadata);
                      skinData = {
                        weapon: metadata.skinWeapon || 'Unknown',
                        skinName: metadata.skinName || 'Claimed Skin',
                        rarity: metadata.skinRarity || 'Unknown',
                        condition: 'Unknown',
                        imageUrl: '',
                        valueUsd: '0',
                      };
                    } catch (e) {
                      console.error('Failed to parse transaction metadata:', e);
                    }
                  }

                  return {
                    id: transaction.id,
                    type: 'skin_claimed' as const,
                    user: {
                      id: transaction.user!.id,
                      username: transaction.user!.username || `User${transaction.user!.id.slice(0, 8)}`,
                      walletAddress: transaction.user!.walletAddress.slice(0, 8) + '...',
                    },
                    skin: {
                      id: transaction.id,
                      weapon: skinData.weapon,
                      skinName: skinData.skinName,
                      rarity: skinData.rarity,
                      condition: skinData.condition,
                      imageUrl: skinData.imageUrl,
                      valueUsd: skinData.valueUsd,
                    },
                    timestamp: transaction.confirmedAt || transaction.createdAt,
                  };
                }
        return null;
      })
      .filter(Boolean);

    // Combine all activities
    const allActivities = [...caseOpeningActivities, ...transactionActivities];

    // Sort by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return allActivities.slice(0, limit);
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