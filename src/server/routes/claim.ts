import { Router } from 'express';
import { ClaimController } from '../controllers/ClaimController';
import { UserService } from '../services/UserService';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';

export const claimRoutes = Router();
const ctrl = new ClaimController();
const walletAuth = new WalletAuthMiddleware(new UserService());

// POST /claim/request - Build burn transaction for claim
claimRoutes.post('/request', walletAuth.requireWallet, ctrl.request);

// POST /claim/confirm - Submit signed burn transaction and mark claimed
claimRoutes.post('/confirm', walletAuth.requireWallet, ctrl.confirm);


