import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateSchema, schemas } from '../middlewares/validation';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const authRoutes = Router();
const authController = new AuthController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// POST /auth/connect - Connect wallet (no auth required)
authRoutes.post('/connect', validateSchema(schemas.connectWallet), authController.connect);

// POST /auth/disconnect - Disconnect wallet (no auth required)
authRoutes.post('/disconnect', authController.disconnect);

// GET /auth/profile - Get user profile (requires wallet)
authRoutes.get('/profile', walletAuth.requireWallet, authController.getProfile);

// PUT /auth/profile - Update profile (requires wallet)
authRoutes.put('/profile', walletAuth.requireWallet, authController.updateProfile);
