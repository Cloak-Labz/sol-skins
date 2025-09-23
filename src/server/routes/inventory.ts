import { Router } from 'express';

export const inventoryRoutes = Router();

inventoryRoutes.get('/', (req, res) => {
  res.json({ message: 'Get inventory endpoint - to be implemented' });
});

inventoryRoutes.post('/:skinId/buyback', (req, res) => {
  res.json({ message: 'Buyback skin endpoint - to be implemented' });
}); 