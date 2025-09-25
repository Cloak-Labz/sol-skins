import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';

export const adminRoutes = Router();
const adminController = new AdminController();

// GET /admin/stats/overview
adminRoutes.get('/stats/overview', adminController.getOverviewStats);

// GET /admin/users
adminRoutes.get('/users', adminController.getUsersStats);

// GET /admin/stats/transactions
adminRoutes.get('/stats/transactions', adminController.getTransactionStats);

// GET /admin/stats/case-openings
adminRoutes.get('/stats/case-openings', adminController.getCaseOpeningStats); 