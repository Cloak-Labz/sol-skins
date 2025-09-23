import { Router } from 'express';

export const marketplaceRoutes = Router();

marketplaceRoutes.get('/loot-boxes', (req, res) => {
  res.json({ message: 'Get loot boxes endpoint - to be implemented' });
});

marketplaceRoutes.get('/loot-boxes/:id', (req, res) => {
  res.json({ message: 'Get loot box details endpoint - to be implemented' });
}); 