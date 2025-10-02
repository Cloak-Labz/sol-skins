import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { validateSchema, schemas } from '../middlewares/validation';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const inventoryRoutes = Router();
const inventoryController = new InventoryController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /inventory - Get user inventory (requires wallet)
inventoryRoutes.get('/', walletAuth.requireWallet, validateSchema(schemas.inventoryQuery, 'query'), inventoryController.getInventory);

// GET /inventory/value - Get inventory value (requires wallet)
inventoryRoutes.get('/value', walletAuth.requireWallet, inventoryController.getInventoryValue);

// GET /inventory/:skinId - Get skin details (requires wallet)
inventoryRoutes.get('/:skinId', walletAuth.requireWallet, inventoryController.getSkinDetails);

// POST /inventory/:skinId/buyback - Sell skin via buyback (requires wallet)
inventoryRoutes.post('/:skinId/buyback', walletAuth.requireWallet, validateSchema(schemas.buyback), inventoryController.sellSkin);
