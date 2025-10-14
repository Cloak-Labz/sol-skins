import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  getOverviewStats = catchAsync(async (req: Request, res: Response) => {
    const stats = await this.adminService.getOverviewStats();

    ResponseUtil.success(res, stats);
  });

  getUsersStats = catchAsync(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      order = 'DESC',
    } = req.query;

    const result = await this.adminService.getUsersStats({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as any,
      order: order as any,
    });

    ResponseUtil.success(res, result.users, 200, result.pagination);
  });

  getTransactionStats = catchAsync(async (req: Request, res: Response) => {
    const { days } = req.query;
    const stats = await this.adminService.getTransactionStats(
      days ? parseInt(days as string) : undefined
    );

    ResponseUtil.success(res, stats);
  });

  getCaseOpeningStats = catchAsync(async (req: Request, res: Response) => {
    const { days } = req.query;
    const stats = await this.adminService.getCaseOpeningStats(
      days ? parseInt(days as string) : undefined
    );

    ResponseUtil.success(res, stats);
  });

  getPacks = catchAsync(async (req: Request, res: Response) => {
    // For now, return empty array - packs will be managed through the Solana program
    // In the future, this could fetch from a database table
    const packs = [];
    ResponseUtil.success(res, packs);
  });
} 