import { Router } from 'express';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/', (req, res) => {
  res.json({ message: 'Get leaderboard endpoint - to be implemented' });
}); 