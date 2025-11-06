import { Router } from 'express';
import { BuybackController } from '../controllers/BuybackController';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';
import { validateSchema, schemas } from '../middlewares/validation';
import { buybackLimiter, publicEndpointsLimiter } from '../middlewares/security';

export const buybackRoutes = Router();
const buybackController = new BuybackController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /buyback/status - Get buyback system status (public)
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
buybackRoutes.get('/status', publicEndpointsLimiter, buybackController.getStatus);

// GET /buyback/calculate/:nftMint - Calculate buyback amount (public)
// SECURITY: Validate nftMint parameter format
buybackRoutes.get('/calculate/:nftMint', publicEndpointsLimiter, validateSchema(schemas.nftMintParam, 'params'), buybackController.calculateBuyback);

// POST /buyback/request - Request a buyback transaction (requires wallet, signature optional since confirm requires signature)
// SECURITY: Rate limited to prevent DoS (10 req/min), nonce validation, CSRF protection
buybackRoutes.post('/request', buybackLimiter, walletAuth.requireWallet, validateSchema(schemas.buybackRequest), buybackController.requestBuyback);

// POST /buyback/confirm - Confirm a buyback transaction (requires wallet, signature optional since we have the signed on-chain transaction)
// SECURITY: Rate limited to prevent DoS (10 req/min), nonce validation, CSRF protection
// The signed transaction itself proves wallet ownership and authorization
buybackRoutes.post('/confirm', buybackLimiter, walletAuth.requireWallet, validateSchema(schemas.buybackConfirm), buybackController.confirmBuyback);

// GET /buyback/history - Get user's buyback history (requires wallet)
buybackRoutes.get('/history', walletAuth.requireWallet, buybackController.getHistory);

