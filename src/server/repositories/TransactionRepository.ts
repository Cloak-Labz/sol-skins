import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Transaction, TransactionType, TransactionStatus } from '../entities/Transaction';

export class TransactionRepository {
  private repository: Repository<Transaction>;

  constructor() {
    this.repository = AppDataSource.getRepository(Transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'lootBoxType', 'userSkin', 'userSkin.skinTemplate'],
    });
  }

  async findByUser(userId: string, options?: {
    skip?: number;
    take?: number;
    search?: string;
    type?: TransactionType;
    sortBy?: string;
  }): Promise<[Transaction[], number]> {
    const queryBuilder = this.repository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.lootBoxType', 'lootBoxType')
      .leftJoinAndSelect('transaction.userSkin', 'userSkin')
      .leftJoinAndSelect('userSkin.skinTemplate', 'skinTemplate')
      .where('transaction.userId = :userId', { userId });

    if (options?.search) {
      queryBuilder.andWhere(
        '(lootBoxType.name ILIKE :search OR skinTemplate.weapon ILIKE :search OR skinTemplate.skinName ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    if (options?.type && options.type !== ('all' as any)) {
      queryBuilder.andWhere('transaction.transactionType = :type', { type: options.type });
    }

    // Sorting
    switch (options?.sortBy) {
      case 'date':
        queryBuilder.orderBy('transaction.createdAt', 'DESC');
        break;
      case 'amount-high':
        queryBuilder.orderBy('transaction.amountUsd', 'DESC');
        break;
      case 'amount-low':
        queryBuilder.orderBy('transaction.amountUsd', 'ASC');
        break;
      default:
        queryBuilder.orderBy('transaction.createdAt', 'DESC');
    }

    if (options?.skip) {
      queryBuilder.skip(options.skip);
    }

    if (options?.take) {
      queryBuilder.take(options.take);
    }

    return queryBuilder.getManyAndCount();
  }

  async create(transactionData: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.repository.create(transactionData);
    return this.repository.save(transaction);
  }

  async update(id: string, transactionData: Partial<Transaction>): Promise<void> {
    await this.repository.update(id, transactionData);
  }

  async updateStatus(id: string, status: TransactionStatus, txHash?: string, blockSlot?: number): Promise<void> {
    const updateData: Partial<Transaction> = { status };
    
    if (txHash) updateData.txHash = txHash;
    if (blockSlot) updateData.blockSlot = blockSlot;
    if (status === TransactionStatus.CONFIRMED) updateData.confirmedAt = new Date();

    await this.repository.update(id, updateData);
  }

  async getUserTransactionSummary(userId: string): Promise<{
    totalSpent: number;
    totalEarned: number;
    netProfit: number;
    casesOpened: number;
    skinsOwned: number;
    skinsSold: number;
  }> {
    const transactions = await this.repository.find({
      where: { userId, status: TransactionStatus.CONFIRMED },
    });

    const totalSpent = transactions
      .filter(t => t.transactionType === TransactionType.OPEN_CASE)
      .reduce((sum, t) => sum + Math.abs(t.amountUsd), 0);

    const totalEarned = transactions
      .filter(t => t.transactionType === TransactionType.BUYBACK)
      .reduce((sum, t) => sum + t.amountUsd, 0);

    const casesOpened = transactions
      .filter(t => t.transactionType === TransactionType.OPEN_CASE)
      .length;

    const skinsSold = transactions
      .filter(t => t.transactionType === TransactionType.BUYBACK)
      .length;

    // Note: skinsOwned would need to be calculated from UserSkin table
    const skinsOwned = 0; // Placeholder

    return {
      totalSpent,
      totalEarned,
      netProfit: totalEarned - totalSpent,
      casesOpened,
      skinsOwned,
      skinsSold,
    };
  }

  async findByTxHash(txHash: string): Promise<Transaction | null> {
    return this.repository.findOne({ where: { txHash } });
  }

  async findPendingTransactions(): Promise<Transaction[]> {
    return this.repository.find({
      where: { status: TransactionStatus.PENDING },
      relations: ['user'],
    });
  }

  async getRevenueStats(days?: number): Promise<{
    totalSol: number;
    totalUsd: number;
    transactionCount: number;
  }> {
    const queryBuilder = this.repository.createQueryBuilder('transaction')
      .select([
        'SUM(CASE WHEN transaction.amountSol > 0 THEN transaction.amountSol ELSE 0 END)', 'totalSolRevenue',
        'SUM(CASE WHEN transaction.amountSol < 0 THEN ABS(transaction.amountSol) ELSE 0 END)', 'totalSolSpent',
        'SUM(CASE WHEN transaction.amountUsd > 0 THEN transaction.amountUsd ELSE 0 END)', 'totalUsdRevenue',
        'SUM(CASE WHEN transaction.amountUsd < 0 THEN ABS(transaction.amountUsd) ELSE 0 END)', 'totalUsdSpent',
        'COUNT(*)', 'transactionCount'
      ])
      .where('transaction.status = :status', { status: TransactionStatus.CONFIRMED });

    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      queryBuilder.andWhere('transaction.createdAt >= :date', { date });
    }

    const result = await queryBuilder.getRawOne();

    return {
      totalSol: parseFloat(result.totalSolRevenue) || 0,
      totalUsd: parseFloat(result.totalUsdRevenue) || 0,
      transactionCount: parseInt(result.transactionCount) || 0,
    };
  }
} 