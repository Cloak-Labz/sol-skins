import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { adminIPWhitelist } from '../middlewares/security';

export const adminRoutes = Router();
const adminController = new AdminController();

// Apply admin IP whitelist to all routes
adminRoutes.use(adminIPWhitelist);

// ========== STATS ENDPOINTS ==========
// GET /admin/stats/overview
adminRoutes.get('/stats/overview', adminController.getOverviewStats);

// GET /admin/users
adminRoutes.get('/users', adminController.getUsersStats);

// GET /admin/stats/transactions
adminRoutes.get('/stats/transactions', adminController.getTransactionStats);

// GET /admin/stats/case-openings
adminRoutes.get('/stats/case-openings', adminController.getCaseOpeningStats);

// ========== SOLANA PROGRAM ENDPOINTS ==========
// POST /admin/solana/initialize - Initialize global state
adminRoutes.post('/solana/initialize', adminController.initializeGlobalState);

// POST /admin/solana/publish-merkle-root - Publish Merkle root for batch
adminRoutes.post('/solana/publish-merkle-root', adminController.publishMerkleRoot);

// POST /admin/solana/create-box - Create box for user
adminRoutes.post('/solana/create-box', adminController.createBox);

// GET /admin/solana/global-state - Get global state
adminRoutes.get('/solana/global-state', adminController.getGlobalState);

// GET /admin/solana/batch/:batchId - Get batch state
adminRoutes.get('/solana/batch/:batchId', adminController.getBatchState);

// GET /admin/solana/box/:userPubkey - Get box state for user
adminRoutes.get('/solana/box/:userPubkey', adminController.getBoxState); 