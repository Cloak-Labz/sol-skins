import { Router } from 'express';

export const historyRoutes = Router();

historyRoutes.get('/transactions', (req, res) => {
  res.json({ message: 'Get transaction history endpoint - to be implemented' });
}); 