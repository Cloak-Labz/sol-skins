import { Router } from 'express';
import { MarketplaceController } from '../controllers/MarketplaceController';
import { validateSchema, schemas } from '../middlewares/validation';

export const marketplaceRoutes = Router();
const marketplaceController = new MarketplaceController();

// GET /marketplace/loot-boxes
marketplaceRoutes.get('/loot-boxes', validateSchema(schemas.lootBoxesQuery, 'query'), marketplaceController.getLootBoxes);

// GET /marketplace/loot-boxes/:id
marketplaceRoutes.get('/loot-boxes/:id', marketplaceController.getLootBoxById);

// GET /marketplace/featured
marketplaceRoutes.get('/featured', marketplaceController.getFeatured);

// Admin routes (simplified for now)
marketplaceRoutes.post('/loot-boxes', marketplaceController.createLootBox);
marketplaceRoutes.put('/loot-boxes/:id', marketplaceController.updateLootBox);
marketplaceRoutes.delete('/loot-boxes/:id', marketplaceController.deleteLootBox); 