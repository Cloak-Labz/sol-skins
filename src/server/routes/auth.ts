import { Router } from 'express';

export const authRoutes = Router();

// Placeholder routes - will be implemented with controllers
authRoutes.post('/connect', (req, res) => {
  res.json({ message: 'Auth connect endpoint - to be implemented' });
});

authRoutes.post('/disconnect', (req, res) => {
  res.json({ message: 'Auth disconnect endpoint - to be implemented' });
}); 