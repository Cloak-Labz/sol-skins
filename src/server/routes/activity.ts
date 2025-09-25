import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';

export const activityRoutes = Router();
const activityController = new ActivityController();

// GET /activity/recent
activityRoutes.get('/recent', activityController.getRecentActivity);

// GET /activity/stats
activityRoutes.get('/stats', activityController.getActivityStats); 