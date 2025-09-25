import { Request, Response } from 'express';
import { ActivityService } from '../services/ActivityService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class ActivityController {
  private activityService: ActivityService;

  constructor() {
    this.activityService = new ActivityService();
  }

  getRecentActivity = catchAsync(async (req: Request, res: Response) => {
    const { limit = 50, type = 'all' } = req.query;

    const activities = await this.activityService.getRecentActivity({
      limit: parseInt(limit as string),
      type: type as any,
    });

    ResponseUtil.success(res, activities);
  });

  getActivityStats = catchAsync(async (req: Request, res: Response) => {
    const stats = await this.activityService.getActivityStats();

    ResponseUtil.success(res, stats);
  });
} 