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

    if (options.sortBy === "amount-high") {
      queryBuilder.orderBy("transaction.amountUsd", "DESC");
    } else if (options.sortBy === "amount-low") {
      queryBuilder.orderBy("transaction.amountUsd", "ASC");
    } else {
      queryBuilder.orderBy("transaction.createdAt", "DESC");
    }

    return queryBuilder.skip(skip).take(limit).getManyAndCount();
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

    return queryBuilder.skip(skip).take(limit).getManyAndCount();
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
  }> {
    // Simple approach: get all transactions and calculate in memory
    const whereCondition: any = { status: TransactionStatus.CONFIRMED };

    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      whereCondition.createdAt = MoreThanOrEqual(date);
    }

    const transactions = await this.repository.find({
      where: whereCondition,
    });

    const totalSol = transactions
      .filter((t) => t.amountSol && t.amountSol > 0)
      .reduce((sum, t) => sum + (t.amountSol || 0), 0);

    const totalUsd = transactions
      .filter((t) => t.amountUsd > 0)
      .reduce((sum, t) => sum + t.amountUsd, 0);

    return {
      totalSol,
      totalUsd,
      transactionCount: transactions.length,
    };
  }
}
