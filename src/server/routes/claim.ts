import { Router } from 'express';
import { ClaimController } from '../controllers/ClaimController';
import { UserService } from '../services/UserService';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { validateSchema, schemas } from '../middlewares/validation';

export const claimRoutes = Router();
const ctrl = new ClaimController();
const walletAuth = new WalletAuthMiddleware(new UserService());

// POST /claim/request - Build burn transaction for claim (requires wallet with signature)
claimRoutes.post('/request', walletAuth.requireWalletWithSignature, validateSchema(schemas.claimRequest), ctrl.request);

// POST /claim/confirm - Submit signed burn transaction and mark claimed (requires wallet with signature)
claimRoutes.post('/confirm', walletAuth.requireWalletWithSignature, validateSchema(schemas.claimConfirm), ctrl.confirm);


