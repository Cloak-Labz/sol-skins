import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';
import { validateSchema, schemas } from '../middlewares/validation';
import { publicEndpointsLimiter } from '../middlewares/security';

export const activityRoutes = Router();
const activityController = new ActivityController();

// GET /activity/recent
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
activityRoutes.get('/recent', publicEndpointsLimiter, validateSchema(schemas.activityQuery, 'query'), activityController.getRecentActivity);

// GET /activity/stats
activityRoutes.get('/stats', publicEndpointsLimiter, activityController.getActivityStats);