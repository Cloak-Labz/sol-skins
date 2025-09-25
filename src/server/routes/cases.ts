import { Router } from 'express';
import { CasesController } from '../controllers/CasesController';
import { validateSchema, schemas } from '../middlewares/validation';

export const casesRoutes = Router();
const casesController = new CasesController();

// POST /cases/open
casesRoutes.post('/open', validateSchema(schemas.openCase), casesController.openCase);

// GET /cases/opening/:id/status
casesRoutes.get('/opening/:id/status', casesController.getOpeningStatus);

// POST /cases/opening/:id/decision
casesRoutes.post('/opening/:id/decision', validateSchema(schemas.caseDecision), casesController.makeDecision);

// GET /cases/openings (user's case openings)
casesRoutes.get('/openings', casesController.getUserCaseOpenings); 