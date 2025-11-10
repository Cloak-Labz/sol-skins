import { Router } from 'express';
import { MarketplaceController } from '../controllers/MarketplaceController';
import { validateSchema, schemas } from '../middlewares/validation';
import { publicEndpointsLimiter } from '../middlewares/security';

export const marketplaceRoutes = Router();
const marketplaceController = new MarketplaceController();

// GET /marketplace/loot-boxes
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
marketplaceRoutes.get('/loot-boxes', publicEndpointsLimiter, validateSchema(schemas.lootBoxesQuery, 'query'), marketplaceController.getLootBoxes);

// GET /marketplace/loot-boxes/:id
marketplaceRoutes.get('/loot-boxes/:id', publicEndpointsLimiter, marketplaceController.getLootBoxById);

// GET /marketplace/featured
marketplaceRoutes.get('/featured', publicEndpointsLimiter, marketplaceController.getFeatured);

// Admin routes (simplified for now)
marketplaceRoutes.post('/loot-boxes', marketplaceController.createLootBox);
marketplaceRoutes.put('/loot-boxes/:id', marketplaceController.updateLootBox);
marketplaceRoutes.delete('/loot-boxes/:id', marketplaceController.deleteLootBox); 