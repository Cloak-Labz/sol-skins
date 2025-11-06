import { Router } from 'express';
import { PendingSkinController } from '../controllers/PendingSkinController';
import { validateSchema, schemas } from '../middlewares/validation';

const router = Router();
const pendingSkinController = new PendingSkinController();

// POST /pending-skins - Create new pending skin
router.post('/', validateSchema(schemas.createPendingSkin), pendingSkinController.createPendingSkin);

// GET /pending-skins/user/:userId - Get pending skins for a user
router.get('/user/:userId', validateSchema(schemas.userIdParam, 'params'), pendingSkinController.getPendingSkinsByUserId);

// GET /pending-skins/:id - Get pending skin by ID
router.get('/:id', validateSchema(schemas.uuidParam, 'params'), pendingSkinController.getPendingSkinById);

// PUT /pending-skins/:id - Update pending skin
router.put('/:id', validateSchema(schemas.uuidParam, 'params'), validateSchema(schemas.updatePendingSkin), pendingSkinController.updatePendingSkin);

// POST /pending-skins/:id/claim - Claim pending skin
router.post('/:id/claim', validateSchema(schemas.uuidParam, 'params'), validateSchema(schemas.claimPendingSkin), pendingSkinController.claimPendingSkin);

// DELETE /pending-skins/:id - Delete pending skin
router.delete('/:id', validateSchema(schemas.uuidParam, 'params'), pendingSkinController.deletePendingSkin);

// DELETE /pending-skins/by-nft/:nftMint - Delete pending skin by NFT mint address
router.delete('/by-nft/:nftMint', validateSchema(schemas.nftMintParam, 'params'), validateSchema(schemas.deletePendingSkinByNft), pendingSkinController.deletePendingSkinByNftMint);

// GET /pending-skins/expired - Get expired pending skins
router.get('/expired', pendingSkinController.getExpiredPendingSkins);

// POST /pending-skins/mark-expired - Mark expired skins
router.post('/mark-expired', pendingSkinController.markExpiredSkins);

// POST /pending-skins/claim-activity - Create skin claimed activity
router.post('/claim-activity', validateSchema(schemas.createSkinClaimedActivity), pendingSkinController.createSkinClaimedActivity);

export default router;
