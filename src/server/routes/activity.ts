import { Router } from 'express';

export const activityRoutes = Router();

activityRoutes.get('/recent', (req, res) => {
  res.json({ message: 'Get recent activity endpoint - to be implemented' });
}); 