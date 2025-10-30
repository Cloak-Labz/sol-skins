import { Router } from 'express';
import { PackOpeningController } from '../controllers/PackOpeningController';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const packOpeningRoutes = Router();
const packOpeningController = new PackOpeningController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// POST /pack-opening/transaction - Create pack opening transaction
packOpeningRoutes.post('/transaction', packOpeningController.createPackOpeningTransaction);

// POST /pack-opening/buyback - Create buyback transaction
packOpeningRoutes.post('/buyback', packOpeningController.createBuybackTransaction);
