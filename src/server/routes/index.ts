import { Router } from 'express';
import { authRoutes } from './auth';
import { marketplaceRoutes } from './marketplace';
import { casesRoutes } from './cases';
import { inventoryRoutes } from './inventory';
import { historyRoutes } from './history';
import { leaderboardRoutes } from './leaderboard';
import { activityRoutes } from './activity';
import { adminRoutes } from './admin';

export async function createRoutes(): Promise<Router> {
  const router = Router();

  // Mount route modules
  router.use('/auth', authRoutes);
  router.use('/marketplace', marketplaceRoutes);
  router.use('/cases', casesRoutes);
  router.use('/inventory', inventoryRoutes);
  router.use('/history', historyRoutes);
  router.use('/leaderboard', leaderboardRoutes);
  router.use('/activity', activityRoutes);
  router.use('/admin', adminRoutes);

  return router;
} 