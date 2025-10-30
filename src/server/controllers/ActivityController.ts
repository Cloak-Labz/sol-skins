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
    const { limit, type = 'all' } = req.query;

    // Handle limit parameter properly - it might be undefined or a string
    const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
    const finalLimit = isNaN(parsedLimit) ? 50 : parsedLimit;

    const activities = await this.activityService.getRecentActivity({
      limit: finalLimit,
      type: type as any,
    });

    ResponseUtil.success(res, activities);
  });

  getActivityStats = catchAsync(async (req: Request, res: Response) => {
    const stats = await this.activityService.getActivityStats();

    ResponseUtil.success(res, stats);
  });
} 