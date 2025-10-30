import { Router } from 'express';
import { CasesController } from '../controllers/CasesController';
import { validateSchema, schemas } from '../middlewares/validation';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const casesRoutes = Router();
const casesController = new CasesController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// POST /cases/open - Open a case (requires wallet)
casesRoutes.post('/open', walletAuth.requireWallet, validateSchema(schemas.openCase), casesController.openCase);

// GET /cases/opening/:id/status - Get case opening status (requires wallet)
casesRoutes.get('/opening/:id/status', walletAuth.requireWallet, casesController.getOpeningStatus);

// POST /cases/opening/:id/decision - Make decision on case opening (requires wallet)
casesRoutes.post('/opening/:id/decision', walletAuth.requireWallet, validateSchema(schemas.caseDecision), casesController.makeDecision);

// GET /cases/openings - Get user's case openings (requires wallet)
casesRoutes.get('/openings', walletAuth.requireWallet, casesController.getUserCaseOpenings);

// POST /cases/pack-opening - Create pack opening record for activity tracking
casesRoutes.post('/pack-opening', casesController.createPackOpeningRecord);
