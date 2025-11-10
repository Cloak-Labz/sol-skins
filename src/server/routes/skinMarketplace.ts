import { Router } from 'express';
import { SkinMarketplaceController } from '../controllers/SkinMarketplaceController';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';
import { validateSchema, schemas } from '../middlewares/validation';
import { publicEndpointsLimiter } from '../middlewares/security';

export const skinMarketplaceRoutes = Router();
const skinMarketplaceController = new SkinMarketplaceController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /skin-marketplace - Get all skin listings
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
skinMarketplaceRoutes.get('/', publicEndpointsLimiter, validateSchema(schemas.skinMarketplaceQuery, 'query'), skinMarketplaceController.getListings);

// POST /skin-marketplace/list - List a skin for sale (requires wallet with signature)
skinMarketplaceRoutes.post('/list', walletAuth.requireWalletWithSignature, validateSchema(schemas.listSkinBody), skinMarketplaceController.listSkin);

// POST /skin-marketplace/buy/:listingId - Buy a listed skin (requires wallet with signature)
skinMarketplaceRoutes.post('/buy/:listingId', walletAuth.requireWalletWithSignature, validateSchema(schemas.listingIdParam, 'params'), validateSchema(schemas.buySkin), skinMarketplaceController.buySkin);

// DELETE /skin-marketplace/cancel/:listingId - Cancel a listing (requires wallet with signature)
skinMarketplaceRoutes.delete('/cancel/:listingId', walletAuth.requireWalletWithSignature, validateSchema(schemas.listingIdParam, 'params'), skinMarketplaceController.cancelListing);

// GET /skin-marketplace/my-listings - Get user's listings (requires wallet)
skinMarketplaceRoutes.get('/my-listings', walletAuth.requireWallet, skinMarketplaceController.getMyListings);

