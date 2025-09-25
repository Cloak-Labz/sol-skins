import { Router } from 'express';
import { HistoryController } from '../controllers/HistoryController';
import { validateSchema, schemas } from '../middlewares/validation';

export const historyRoutes = Router();
const historyController = new HistoryController();

// GET /history/transactions
historyRoutes.get('/transactions', validateSchema(schemas.transactionsQuery, 'query'), historyController.getTransactions);

// GET /history/transactions/:id
historyRoutes.get('/transactions/:id', historyController.getTransactionById);

// GET /history/summary
historyRoutes.get('/summary', historyController.getTransactionSummary); 