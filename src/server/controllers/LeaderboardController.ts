import { Request, Response } from 'express';
import { LeaderboardService } from '../services/LeaderboardService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class LeaderboardController {
  private leaderboardService: LeaderboardService;

  constructor() {
    this.leaderboardService = new LeaderboardService();
  }

  getLeaderboard = catchAsync(async (req: Request, res: Response) => {
    const {
      period = 'all-time',
      metric = 'points',
      limit = 100,
    } = req.query;

    const leaderboard = await this.leaderboardService.getLeaderboard({
      period: period as any,
      metric: metric as any,
      limit: parseInt(limit as string),
    });

    ResponseUtil.success(res, leaderboard);
  });

  getUserRank = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { metric = 'points' } = req.query;

    const rank = await this.leaderboardService.getUserRank(userId, metric as any);

    ResponseUtil.success(res, rank);
  });
} 