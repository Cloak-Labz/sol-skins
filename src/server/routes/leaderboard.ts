import { Router } from 'express';
import { LeaderboardController } from '../controllers/LeaderboardController';
import { validateSchema, schemas } from '../middlewares/validation';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const leaderboardRoutes = Router();
const leaderboardController = new LeaderboardController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /leaderboard - Get leaderboard (public)
leaderboardRoutes.get('/', validateSchema(schemas.leaderboardQuery, 'query'), leaderboardController.getLeaderboard);

// GET /leaderboard/rank - Get user's rank (requires wallet)
leaderboardRoutes.get('/rank', walletAuth.requireWallet, leaderboardController.getUserRank);
