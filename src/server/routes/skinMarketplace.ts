import { Router } from 'express';
import { SkinMarketplaceController } from '../controllers/SkinMarketplaceController';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const skinMarketplaceRoutes = Router();
const skinMarketplaceController = new SkinMarketplaceController();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /skin-marketplace - Get all skin listings
skinMarketplaceRoutes.get('/', skinMarketplaceController.getListings);

// POST /skin-marketplace/list - List a skin for sale (requires wallet)
skinMarketplaceRoutes.post('/list', walletAuth.requireWallet, skinMarketplaceController.listSkin);

// POST /skin-marketplace/buy/:listingId - Buy a listed skin (requires wallet)
skinMarketplaceRoutes.post('/buy/:listingId', walletAuth.requireWallet, skinMarketplaceController.buySkin);

// DELETE /skin-marketplace/cancel/:listingId - Cancel a listing (requires wallet)
skinMarketplaceRoutes.delete('/cancel/:listingId', walletAuth.requireWallet, skinMarketplaceController.cancelListing);

// GET /skin-marketplace/my-listings - Get user's listings (requires wallet)
skinMarketplaceRoutes.get('/my-listings', walletAuth.requireWallet, skinMarketplaceController.getMyListings);

