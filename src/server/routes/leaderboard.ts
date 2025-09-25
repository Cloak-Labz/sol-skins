import { Router } from 'express';
import { LeaderboardController } from '../controllers/LeaderboardController';
import { validateSchema, schemas } from '../middlewares/validation';

export const leaderboardRoutes = Router();
const leaderboardController = new LeaderboardController();

// GET /leaderboard
leaderboardRoutes.get('/', validateSchema(schemas.leaderboardQuery, 'query'), leaderboardController.getLeaderboard);

// GET /leaderboard/rank (user's rank)
leaderboardRoutes.get('/rank', leaderboardController.getUserRank); 