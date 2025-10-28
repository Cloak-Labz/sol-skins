import { Router } from 'express';
import { PendingSkinController } from '../controllers/PendingSkinController';

const router = Router();
const pendingSkinController = new PendingSkinController();

// POST /pending-skins - Create new pending skin
router.post('/', pendingSkinController.createPendingSkin);

// GET /pending-skins/user/:userId - Get pending skins for a user
router.get('/user/:userId', pendingSkinController.getPendingSkinsByUserId);

// GET /pending-skins/:id - Get pending skin by ID
router.get('/:id', pendingSkinController.getPendingSkinById);

// PUT /pending-skins/:id - Update pending skin
router.put('/:id', pendingSkinController.updatePendingSkin);

// POST /pending-skins/:id/claim - Claim pending skin
router.post('/:id/claim', pendingSkinController.claimPendingSkin);

// DELETE /pending-skins/:id - Delete pending skin
router.delete('/:id', pendingSkinController.deletePendingSkin);

// DELETE /pending-skins/by-nft/:nftMint - Delete pending skin by NFT mint address
router.delete('/by-nft/:nftMint', pendingSkinController.deletePendingSkinByNftMint);

// GET /pending-skins/expired - Get expired pending skins
router.get('/expired', pendingSkinController.getExpiredPendingSkins);

// POST /pending-skins/mark-expired - Mark expired skins
router.post('/mark-expired', pendingSkinController.markExpiredSkins);

export default router;
