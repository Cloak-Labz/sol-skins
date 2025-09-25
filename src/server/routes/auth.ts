import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateSchema, schemas } from '../middlewares/validation';

export const authRoutes = Router();
const authController = new AuthController();

// POST /auth/connect
authRoutes.post('/connect', validateSchema(schemas.connectWallet), authController.connect);

// POST /auth/disconnect  
authRoutes.post('/disconnect', authController.disconnect);

// GET /auth/profile
authRoutes.get('/profile', authController.getProfile);

// PUT /auth/profile
authRoutes.put('/profile', authController.updateProfile); 