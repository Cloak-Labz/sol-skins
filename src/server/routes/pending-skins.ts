import { Router } from 'express';
import { PendingSkinController } from '../controllers/PendingSkinController';
import { catchAsync } from '../middlewares/errorHandler';

const router = Router();
const pendingSkinController = new PendingSkinController();

// Create a new pending skin
router.post('/', catchAsync(pendingSkinController.createPendingSkin));

// Get user's pending skins
router.get('/user/:userId', catchAsync(pendingSkinController.getUserPendingSkins));

// Get a specific pending skin
router.get('/:id', catchAsync(pendingSkinController.getPendingSkinById));

// Claim a pending skin
router.post('/:pendingSkinId/claim', catchAsync(pendingSkinController.claimPendingSkin));

// Cleanup expired skins (admin endpoint)
router.post('/cleanup', catchAsync(pendingSkinController.cleanupExpiredSkins));

export default router;
