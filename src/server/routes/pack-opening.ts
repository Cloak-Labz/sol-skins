import { Router } from 'express';
import { PackOpeningController } from '../controllers/PackOpeningController';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';
import { caseOpeningLimiter } from '../middlewares/security';
import { validateSchema, schemas } from '../middlewares/validation';

export const packOpeningRoutes = Router();
const packOpeningController = new PackOpeningController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// POST /pack-opening/transaction - Create pack opening transaction (requires wallet, signature optional since we have the mint signature)
packOpeningRoutes.post('/transaction', caseOpeningLimiter, walletAuth.requireWallet, validateSchema(schemas.packOpeningTransaction), packOpeningController.createPackOpeningTransaction);

// POST /pack-opening/buyback - Create buyback transaction (requires wallet with signature)
packOpeningRoutes.post('/buyback', walletAuth.requireWalletWithSignature, validateSchema(schemas.packOpeningBuyback), packOpeningController.createBuybackTransaction);
