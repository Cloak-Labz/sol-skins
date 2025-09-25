import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { validateSchema, schemas } from '../middlewares/validation';

export const inventoryRoutes = Router();
const inventoryController = new InventoryController();

// GET /inventory
inventoryRoutes.get('/', validateSchema(schemas.inventoryQuery, 'query'), inventoryController.getInventory);

// GET /inventory/value
inventoryRoutes.get('/value', inventoryController.getInventoryValue);

// GET /inventory/:skinId
inventoryRoutes.get('/:skinId', inventoryController.getSkinDetails);

// POST /inventory/:skinId/buyback
inventoryRoutes.post('/:skinId/buyback', validateSchema(schemas.buyback), inventoryController.sellSkin); 