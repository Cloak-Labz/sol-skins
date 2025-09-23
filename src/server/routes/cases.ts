import { Router } from 'express';

export const casesRoutes = Router();

casesRoutes.post('/open', (req, res) => {
  res.json({ message: 'Open case endpoint - to be implemented' });
});

casesRoutes.get('/opening/:id/status', (req, res) => {
  res.json({ message: 'Case opening status endpoint - to be implemented' });
});

casesRoutes.post('/opening/:id/decision', (req, res) => {
  res.json({ message: 'Case opening decision endpoint - to be implemented' });
}); 