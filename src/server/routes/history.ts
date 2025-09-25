import { Router } from 'express';
import { HistoryController } from '../controllers/HistoryController';
import { validateSchema, schemas } from '../middlewares/validation';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const historyRoutes = Router();
const historyController = new HistoryController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /history/transactions - Get user transaction history (requires wallet)
historyRoutes.get('/transactions', walletAuth.requireWallet, validateSchema(schemas.transactionsQuery, 'query'), historyController.getTransactions);

// GET /history/transactions/:id - Get specific transaction (requires wallet)
historyRoutes.get('/transactions/:id', walletAuth.requireWallet, historyController.getTransactionById);

// GET /history/summary - Get transaction summary (requires wallet)
historyRoutes.get('/summary', walletAuth.requireWallet, historyController.getTransactionSummary);
