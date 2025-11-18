import { Repository, IsNull, MoreThanOrEqual } from "typeorm";
import { Transaction } from "../entities/Transaction";
import { TransactionType, TransactionStatus } from "../entities/Transaction";
import { AppDataSource } from "../config/database";

export class TransactionRepository {
  private repository: Repository<Transaction>;

  constructor() {
    this.repository = AppDataSource.getRepository(Transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["user", "lootBoxType", "userSkin"],
    });
  }

  async findAll(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      sortBy?: string;
      walletAddress?: string;
    } = {}
  ): Promise<[Transaction[], number]> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.user", "user")
      .leftJoinAndSelect("transaction.lootBoxType", "lootBoxType")
      .leftJoinAndSelect("transaction.userSkin", "userSkin")
      .leftJoinAndSelect("userSkin.skinTemplate", "skinTemplate");

    if (options.search) {
      queryBuilder.andWhere(
        "(lootBoxType.name ILIKE :search OR userSkin.weapon ILIKE :search OR userSkin.skinName ILIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    if (options.type && options.type !== "all") {
      queryBuilder.andWhere("transaction.transactionType = :type", {
        type: options.type as TransactionType,
      });
    }

    if (options.walletAddress) {
      // Normalize wallet address to lowercase for comparison
      const normalizedWalletAddress = options.walletAddress.toLowerCase();
      queryBuilder.andWhere("LOWER(user.walletAddress) = LOWER(:walletAddress)", {
        walletAddress: normalizedWalletAddress,
      });
    }

    if (options.sortBy === "amount-high") {
      queryBuilder.orderBy("transaction.amountUsd", "DESC");
    } else if (options.sortBy === "amount-low") {
      queryBuilder.orderBy("transaction.amountUsd", "ASC");
    } else {
      queryBuilder.orderBy("transaction.createdAt", "DESC");
    }

    // SECURITY: Apply query timeout to prevent slow query attacks
    const { queryBuilderWithTimeout, getTimeoutForOperation } = require('../utils/queryTimeout');
    return queryBuilderWithTimeout(
      queryBuilder.skip(skip).take(limit).getManyAndCount(),
      getTimeoutForOperation('complex'),
      'TransactionRepository.findAll'
    );
  }

  async findByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      sortBy?: string;
    } = {}
  ): Promise<[Transaction[], number]> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.lootBoxType", "lootBoxType")
      .leftJoinAndSelect("transaction.userSkin", "userSkin")
      .where("transaction.userId = :userId", { userId });

    if (options.search) {
      queryBuilder.andWhere(
        "(lootBoxType.name ILIKE :search OR userSkin.weapon ILIKE :search OR userSkin.skinName ILIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    if (options.type && options.type !== "all") {
      queryBuilder.andWhere("transaction.transactionType = :type", {
        type: options.type as TransactionType,
      });
    }

    if (options.sortBy === "amount-high") {
      queryBuilder.orderBy("transaction.amountUsd", "DESC");
    } else if (options.sortBy === "amount-low") {
      queryBuilder.orderBy("transaction.amountUsd", "ASC");
    } else {
      queryBuilder.orderBy("transaction.createdAt", "DESC");
    }

    // SECURITY: Apply query timeout to prevent slow query attacks
    const { queryBuilderWithTimeout, getTimeoutForOperation } = require('../utils/queryTimeout');
    return queryBuilderWithTimeout(
      queryBuilder.skip(skip).take(limit).getManyAndCount(),
      getTimeoutForOperation('complex'),
      'TransactionRepository.findByUser'
    );
  }

  async create(transactionData: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.repository.create(transactionData);
    return this.repository.save(transaction);
  }

  async update(id: string, updateData: Partial<Transaction>): Promise<void> {
    await this.repository.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async updateTransactionStatus(
    id: string,
    status: TransactionStatus,
    txHash?: string,
    blockSlot?: number
  ): Promise<void> {
    const updateData: Partial<Transaction> = { status };

    if (txHash) updateData.txHash = txHash;
    if (blockSlot) updateData.blockSlot = blockSlot;
    if (status === TransactionStatus.CONFIRMED)
      updateData.confirmedAt = new Date();

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
      .filter((t) => t.transactionType === TransactionType.OPEN_CASE)
      .reduce((sum, t) => sum + Math.abs(t.amountUsd), 0);

    const totalEarned = transactions
      .filter((t) => t.transactionType === TransactionType.BUYBACK)
      .reduce((sum, t) => sum + t.amountUsd, 0);

    const casesOpened = transactions.filter(
      (t) => t.transactionType === TransactionType.OPEN_CASE
    ).length;

    const skinsSold = transactions.filter(
      (t) => t.transactionType === TransactionType.BUYBACK
    ).length;

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
      relations: ["user"],
    });
  }

  async getRevenueStats(days?: number): Promise<{
    totalSol: number;
    totalUsd: number;
    transactionCount: number;
    grossRevenueSol?: number;
    grossRevenueUsd?: number;
    buybackCostSol?: number;
    buybackCostUsd?: number;
  }> {
    // Calculate revenue from case openings (box sales) minus buyback costs
    const { AppDataSource } = require('../config/database');
    const { CaseOpening } = require('../entities/CaseOpening');
    const { LootBoxType } = require('../entities/LootBoxType');
    const { BuybackRecord } = require('../entities/BuybackRecord');
    
    const caseOpeningRepo = AppDataSource.getRepository(CaseOpening);
    const buybackRepo = AppDataSource.getRepository(BuybackRecord);
    
    // Build query for case openings
    let caseOpeningsQuery = caseOpeningRepo
      .createQueryBuilder('opening')
      .leftJoinAndSelect('opening.lootBoxType', 'lootBoxType')
      .where('opening.completedAt IS NOT NULL');
    
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      caseOpeningsQuery = caseOpeningsQuery.andWhere('opening.openedAt >= :date', { date });
    }
    
    const caseOpenings = await caseOpeningsQuery.getMany();
    
    // Calculate revenue from case openings
    // Use boxPriceSol if available, otherwise use lootBoxType.priceSol
    // Convert SOL to USD (assuming ~$200 per SOL, or use priceUsdc if available)
    const SOL_TO_USD = 200; // Default conversion rate
    let totalRevenueSol = 0;
    let totalRevenueUsd = 0;
    
    caseOpenings.forEach(opening => {
      let priceSol = 0;
      let priceUsd = 0;
      
      // Try to get price from boxPriceUsdc first (for pack openings - USDC)
      if (opening.boxPriceUsdc) {
        priceUsd = Number(opening.boxPriceUsdc); // USDC is 1:1 with USD
        priceSol = 0; // Not used for pack openings
      } else if (opening.boxPriceSol) {
        // Legacy: fallback to boxPriceSol if boxPriceUsdc not set
        priceSol = Number(opening.boxPriceSol);
        priceUsd = priceSol * SOL_TO_USD; // Convert SOL to USD
      } else if (opening.lootBoxType) {
        priceSol = Number(opening.lootBoxType.priceSol || 0);
        // Use priceUsdc if available, otherwise convert from SOL
        if (opening.lootBoxType.priceUsdc) {
          priceUsd = Number(opening.lootBoxType.priceUsdc);
        } else {
          priceUsd = priceSol * SOL_TO_USD;
        }
      }
      
      totalRevenueSol += priceSol;
      totalRevenueUsd += priceUsd;
    });
    
    // Calculate buyback costs
    let buybackQuery = buybackRepo.createQueryBuilder('buyback');
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      buybackQuery = buybackQuery.where('buyback.createdAt >= :date', { date });
    }
    
    const buybacks = await buybackQuery.getMany();
    const totalBuybackCostSol = buybacks.reduce((sum, b) => sum + Number(b.amountPaid || 0), 0);
    const totalBuybackCostUsd = totalBuybackCostSol * SOL_TO_USD;
    
    // Net revenue = revenue from boxes - buyback costs
    const netRevenueSol = totalRevenueSol - totalBuybackCostSol;
    const netRevenueUsd = totalRevenueUsd - totalBuybackCostUsd;
    
    // Get transaction count (for compatibility)
    const whereCondition: any = { status: TransactionStatus.CONFIRMED };
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      whereCondition.createdAt = MoreThanOrEqual(date);
    }
    const transactions = await this.repository.find({
      where: whereCondition,
    });
    
    return {
      totalSol: netRevenueSol,
      totalUsd: netRevenueUsd,
      transactionCount: transactions.length,
      // Additional breakdown for analytics
      grossRevenueSol: totalRevenueSol,
      grossRevenueUsd: totalRevenueUsd,
      buybackCostSol: totalBuybackCostSol,
      buybackCostUsd: totalBuybackCostUsd,
    };
  }
}
