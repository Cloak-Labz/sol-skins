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

// GET /inventory/stats - Get inventory statistics (requires wallet)
inventoryRoutes.get('/stats', walletAuth.requireWallet, inventoryController.getInventoryStats);

// Steam inventory routes (must come BEFORE /:skinId to avoid conflicts)
// GET /inventory/steam/stats - Get Steam inventory stats (requires wallet)
inventoryRoutes.get('/steam/stats', walletAuth.requireWallet, inventoryController.getSteamInventoryStats);

// GET /inventory/steam - Get imported Steam inventory (requires wallet)
inventoryRoutes.get('/steam', walletAuth.requireWallet, inventoryController.getSteamInventory);

// POST /inventory/steam/import - Import CS2 Steam inventory (requires wallet)
inventoryRoutes.post('/steam/import', walletAuth.requireWallet, inventoryController.importSteamInventory);

// POST /inventory/claim - Mark a skin as claimed by nft mint (requires wallet)
inventoryRoutes.post('/claim', walletAuth.requireWallet, inventoryController.claimByMint);

// Dynamic routes (must come LAST)
// GET /inventory/:skinId - Get skin details (requires wallet)
inventoryRoutes.get('/:skinId', walletAuth.requireWallet, inventoryController.getSkinDetails);

// POST /inventory/:skinId/buyback - Sell skin via buyback (requires wallet)
inventoryRoutes.post('/:skinId/buyback', walletAuth.requireWallet, validateSchema(schemas.buyback), inventoryController.sellSkin);
