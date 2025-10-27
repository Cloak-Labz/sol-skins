import { Router } from 'express';
import { BuybackController } from '../controllers/BuybackController';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const buybackRoutes = Router();
const buybackController = new BuybackController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /buyback/status - Get buyback system status (public)
buybackRoutes.get('/status', buybackController.getStatus);

// GET /buyback/calculate/:nftMint - Calculate buyback amount (public)
buybackRoutes.get('/calculate/:nftMint', buybackController.calculateBuyback);

// POST /buyback/request - Request a buyback transaction (requires wallet)
buybackRoutes.post('/request', walletAuth.requireWallet, buybackController.requestBuyback);

// POST /buyback/confirm - Confirm a buyback transaction (requires wallet)
buybackRoutes.post('/confirm', walletAuth.requireWallet, buybackController.confirmBuyback);

// GET /buyback/history - Get user's buyback history (requires wallet)
buybackRoutes.get('/history', walletAuth.requireWallet, buybackController.getHistory);

