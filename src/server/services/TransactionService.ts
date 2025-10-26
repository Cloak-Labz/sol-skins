import { TransactionRepository } from "../repositories/TransactionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { AppError } from "../middlewares/errorHandler";
import { TransactionType } from "../entities/Transaction";

export class TransactionService {
  private transactionRepository: TransactionRepository;
  private userRepository: UserRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.userRepository = new UserRepository();
  }

  async getUserTransactions(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      sortBy?: string;
    }
  ) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [transactions, total] = await this.transactionRepository.findByUser(
      userId,
      {
        page: options.page,
        limit: options.limit,
        search: options.search,
        type: options.type as TransactionType,
        sortBy: options.sortBy,
      }
    );

    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.transactionType,
      amountSol: transaction.amountSol,
      amountUsdc: transaction.amountUsdc,
      amountUsd: transaction.amountUsd,
      lootBoxType: transaction.lootBoxType
        ? {
            id: transaction.lootBoxType.id,
            name: transaction.lootBoxType.name,
            imageUrl: transaction.lootBoxType.imageUrl,
          }
        : null,
      resultSkin: transaction.userSkin?.skinTemplate
        ? {
            id: transaction.userSkin.skinTemplate.id,
            weapon: transaction.userSkin.skinTemplate.weapon,
            skinName: transaction.userSkin.skinTemplate.skinName,
            rarity: transaction.userSkin.skinTemplate.rarity,
            imageUrl: transaction.userSkin.skinTemplate.imageUrl,
          }
        : null,
      txHash: transaction.txHash,
      blockSlot: transaction.blockSlot,
      status: transaction.status,
      createdAt: transaction.createdAt,
      confirmedAt: transaction.confirmedAt,
    }));

    const summary = await this.transactionRepository.getUserTransactionSummary(
      userId
    );

    return {
      transactions: formattedTransactions,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionById(userId: string, transactionId: string) {
    const transaction = await this.transactionRepository.findById(
      transactionId
    );

    if (!transaction) {
      throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
    }

    if (transaction.userId !== userId) {
      throw new AppError(
        "Unauthorized to view this transaction",
        403,
        "UNAUTHORIZED"
      );
    }

    return {
      id: transaction.id,
      type: transaction.transactionType,
      amountSol: transaction.amountSol,
      amountUsdc: transaction.amountUsdc,
      amountUsd: transaction.amountUsd,
      lootBoxType: transaction.lootBoxType,
      resultSkin: transaction.userSkin,
      txHash: transaction.txHash,
      blockSlot: transaction.blockSlot,
      status: transaction.status,
      createdAt: transaction.createdAt,
      confirmedAt: transaction.confirmedAt,
    };
  }

  async getUserTransactionSummary(userId: string) {
    return this.transactionRepository.getUserTransactionSummary(userId);
  }
}
