import { Router } from 'express';

export const adminRoutes = Router();

adminRoutes.get('/stats/overview', (req, res) => {
  res.json({ message: 'Get admin stats endpoint - to be implemented' });
}); 