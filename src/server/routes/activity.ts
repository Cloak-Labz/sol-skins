import { Router, Request, Response, NextFunction } from 'express';
import { ActivityController } from '../controllers/ActivityController';
import { validateSchema, schemas } from '../middlewares/validation';
import { publicEndpointsLimiter } from '../middlewares/security';
import { getAuth } from '../middlewares/auth';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const activityRoutes = Router();
const activityController = new ActivityController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// Wrapper for optional auth that gets the middleware at request time
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth();
    return auth.optionalAuth(req, res, next);
  } catch (error) {
    // If auth is not initialized, just continue without auth
    next();
  }
};

// GET /activity/recent - Get all activities (for activity page)
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
activityRoutes.get('/recent', publicEndpointsLimiter, optionalAuth, validateSchema(schemas.activityQuery, 'query'), activityController.getRecentActivity);

// GET /activity/user - Get user's own activities (for profile page)
// SECURITY: Requires wallet authentication
activityRoutes.get('/user', publicEndpointsLimiter, walletAuth.requireWallet, validateSchema(schemas.activityQuery, 'query'), activityController.getUserActivity);

// GET /activity/stats
activityRoutes.get('/stats', publicEndpointsLimiter, activityController.getActivityStats);