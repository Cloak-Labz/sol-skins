import { Request, Response } from 'express';
import { TransactionService } from '../services/TransactionService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class HistoryController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  getTransactions = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      search,
      type = 'all',
      sortBy = 'date',
      page = 1,
      limit = 20,
    } = req.query;

    const result = await this.transactionService.getUserTransactions(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      type: type as string,
      sortBy: sortBy as string,
    });

    ResponseUtil.success(res, result);
  });

  getTransactionById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const transaction = await this.transactionService.getTransactionById(userId, id);

    ResponseUtil.success(res, transaction);
  });

  getTransactionSummary = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const summary = await this.transactionService.getUserTransactionSummary(userId);

    ResponseUtil.success(res, summary);
  });
} 