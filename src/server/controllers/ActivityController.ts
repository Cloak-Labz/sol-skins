import { Request, Response } from 'express';
import { ActivityService } from '../services/ActivityService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class ActivityController {
  private activityService: ActivityService;

  constructor() {
    this.activityService = new ActivityService();
  }

  // Get all activities (for activity page)
  getRecentActivity = catchAsync(async (req: Request, res: Response) => {
    const { limit, type = 'all' } = req.query;

    // Handle limit parameter properly - it might be undefined or a string
    const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
    const finalLimit = isNaN(parsedLimit) ? 50 : parsedLimit;

    // Always show all activities (no user filter)
    const activities = await this.activityService.getRecentActivity({
      limit: finalLimit,
      type: type as any,
      walletAddress: undefined, // Never filter by user
    });

    ResponseUtil.success(res, activities);
  });

  // Get user's own activities (for profile page) - requires authentication
  getUserActivity = catchAsync(async (req: Request, res: Response) => {
    const { limit, type = 'all' } = req.query;

    // Handle limit parameter properly - it might be undefined or a string
    const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
    const finalLimit = isNaN(parsedLimit) ? 50 : parsedLimit;

    // Get wallet address from authenticated user
    const authenticatedUser = (req as any).user;
    const walletAddress = authenticatedUser?.walletAddress;

    // If no user is authenticated, return empty array
    if (!walletAddress) {
      ResponseUtil.success(res, []);
      return;
    }

    // Only show activities for the authenticated user
    const activities = await this.activityService.getRecentActivity({
      limit: finalLimit,
      type: type as any,
      walletAddress: walletAddress,
    });

    ResponseUtil.success(res, activities);
  });

  getActivityStats = catchAsync(async (req: Request, res: Response) => {
    const stats = await this.activityService.getActivityStats();

    ResponseUtil.success(res, stats);
  });
} 