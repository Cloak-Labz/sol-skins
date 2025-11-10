import { Router } from 'express';
import { LeaderboardController } from '../controllers/LeaderboardController';
import { validateSchema, schemas } from '../middlewares/validation';
import { publicEndpointsLimiter } from '../middlewares/security';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const leaderboardRoutes = Router();
const leaderboardController = new LeaderboardController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /leaderboard - Get leaderboard (public)
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
leaderboardRoutes.get('/', publicEndpointsLimiter, validateSchema(schemas.leaderboardQuery, 'query'), leaderboardController.getLeaderboard);

// GET /leaderboard/rank - Get user's rank (requires wallet)
leaderboardRoutes.get('/rank', walletAuth.requireWallet, leaderboardController.getUserRank);
