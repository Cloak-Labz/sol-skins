import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { SkinListing } from '../entities/SkinListing';
import { UserSkin } from '../entities/UserSkin';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class SkinMarketplaceController {
  private skinListingRepository = AppDataSource.getRepository(SkinListing);
  private userSkinRepository = AppDataSource.getRepository(UserSkin);

  // Get all active listings
  getListings = catchAsync(async (req: Request, res: Response) => {
    const { search, sortBy = 'newest', filterBy, limit = 50 } = req.query;

    let query = this.skinListingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.userSkin', 'userSkin')
      .leftJoinAndSelect('userSkin.skinTemplate', 'skinTemplate')
      .leftJoinAndSelect('listing.user', 'user')
      .where('listing.status = :status', { status: 'active' });

    // Search filter
    if (search) {
      query = query.andWhere(
        '(skinTemplate.weapon LIKE :search OR skinTemplate.skinName LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Rarity filter
    if (filterBy && filterBy !== 'all') {
      query = query.andWhere('skinTemplate.rarity = :rarity', { rarity: filterBy });
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        query = query.orderBy('listing.priceUsd', 'ASC');
        break;
      case 'price-high':
        query = query.orderBy('listing.priceUsd', 'DESC');
        break;
      case 'newest':
        query = query.orderBy('listing.createdAt', 'DESC');
        break;
      default:
        query = query.orderBy('listing.createdAt', 'DESC');
    }

    query = query.limit(Number(limit));

    const listings = await query.getMany();

    // Transform data
    const transformedListings = listings.map(listing => ({
      id: listing.id,
      skinName: `${listing.userSkin?.skinTemplate?.weapon || 'Unknown'} | ${listing.userSkin?.skinTemplate?.skinName || 'Unknown'}`,
      weapon: listing.userSkin?.skinTemplate?.weapon || 'Unknown',
      skinDisplayName: listing.userSkin?.skinTemplate?.skinName || 'Unknown',
      condition: 'Field-Tested', // Default condition
      rarity: listing.userSkin?.skinTemplate?.rarity || 'Common',
      price: parseFloat(listing.priceUsd),
      priceSol: listing.priceSol ? parseFloat(listing.priceSol) : null,
      seller: listing.user?.username || listing.user?.walletAddress?.slice(0, 8) + '...' || 'Unknown',
      sellerAddress: listing.user?.walletAddress || '',
      imageUrl: listing.userSkin?.skinTemplate?.imageUrl,
      listedAt: listing.createdAt,
      userSkinId: listing.userSkinId,
    }));

    ResponseUtil.success(res, transformedListings);
  });

  // List a skin for sale
  listSkin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { walletAddress } = req.body;
    const { userSkinId, priceUsd } = req.body;

    if (!userSkinId || !priceUsd) {
      ResponseUtil.error(res, 'User skin ID and price are required', 400);
      return;
    }

    // Verify the skin belongs to the user and is available
    const userSkin = await this.userSkinRepository.findOne({
      where: { id: userSkinId },
      relations: ['user', 'skinTemplate'],
    });

    if (!userSkin) {
      ResponseUtil.error(res, 'Skin not found', 404);
      return;
    }

    if (userSkin.user.walletAddress !== walletAddress) {
      ResponseUtil.error(res, 'You do not own this skin', 403);
      return;
    }

    // Check if skin is available (not already sold or listed)
    if (!userSkin.isInInventory || userSkin.soldViaBuyback) {
      ResponseUtil.error(res, 'Skin is not available for listing', 400);
      return;
    }

    // Check if already listed
    const existingListing = await this.skinListingRepository.findOne({
      where: { userSkinId, status: 'active' },
    });

    if (existingListing) {
      ResponseUtil.error(res, 'This skin is already listed', 400);
      return;
    }

    // Create listing
    const listing = this.skinListingRepository.create({
      userId: userSkin.user.id,
      userSkinId,
      priceUsd: priceUsd.toString(),
      status: 'active',
    });

    await this.skinListingRepository.save(listing);

    ResponseUtil.success(res, {
      message: 'Skin listed successfully',
      listing: {
        id: listing.id,
        price: priceUsd,
        listedAt: listing.createdAt,
      },
    });
  });

  // Buy a skin
  buySkin = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { walletAddress } = req.body;
    const { listingId } = req.params;

    const listing = await this.skinListingRepository.findOne({
      where: { id: listingId, status: 'active' },
      relations: ['userSkin', 'userSkin.skinTemplate', 'user'],
    });

    if (!listing) {
      ResponseUtil.error(res, 'Listing not found or no longer available', 404);
      return;
    }

    // Can't buy your own listing
    if (listing.user.walletAddress === walletAddress) {
      ResponseUtil.error(res, 'You cannot buy your own listing', 400);
      return;
    }

    // In production, this would:
    // 1. Process SOL payment from buyer to seller
    // 2. Transfer NFT ownership
    // 3. Handle platform fees
    
    // For now, just update the database
    listing.status = 'sold';
    listing.soldAt = new Date();
    
    // Find buyer
    const buyerRepository = AppDataSource.getRepository(require('../entities/User').User);
    // SECURITY: Validate wallet address before query
    const { isValidWalletAddress } = require('../utils/solanaValidation');
    if (!isValidWalletAddress(walletAddress)) {
      ResponseUtil.error(res, 'Invalid wallet address format', 400);
      return;
    }
    
    const buyer = await buyerRepository.findOne({ where: { walletAddress } });
    
    if (buyer) {
      listing.soldToUserId = buyer.id;
    }

    await this.skinListingRepository.save(listing);

    // Transfer skin ownership
    const userSkin = listing.userSkin;
    userSkin.userId = buyer!.id;
    await this.userSkinRepository.save(userSkin);

    ResponseUtil.success(res, {
      message: 'Skin purchased successfully',
      purchase: {
        skinName: `${userSkin?.skinTemplate?.weapon || 'Unknown'} | ${userSkin?.skinTemplate?.skinName || 'Unknown'}`,
        price: parseFloat(listing.priceUsd),
        seller: listing.user?.username || listing.user?.walletAddress?.slice(0, 8) || 'Unknown',
      },
    });
  });

  // Cancel a listing
  cancelListing = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { walletAddress } = req.body;
    const { listingId } = req.params;

    const listing = await this.skinListingRepository.findOne({
      where: { id: listingId },
      relations: ['user', 'userSkin'],
    });

    if (!listing) {
      ResponseUtil.error(res, 'Listing not found', 404);
      return;
    }

    if (listing.user.walletAddress !== walletAddress) {
      ResponseUtil.error(res, 'You do not own this listing', 403);
      return;
    }

    if (listing.status !== 'active') {
      ResponseUtil.error(res, 'Listing is not active', 400);
      return;
    }

    listing.status = 'cancelled';
    await this.skinListingRepository.save(listing);

    ResponseUtil.success(res, {
      message: 'Listing cancelled successfully',
    });
  });

  // Get user's listings
  getMyListings = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { walletAddress } = req.body;

    const userRepository = AppDataSource.getRepository(require('../entities/User').User);
    // SECURITY: Validate wallet address before query
    const { isValidWalletAddress } = require('../utils/solanaValidation');
    if (!isValidWalletAddress(walletAddress)) {
      ResponseUtil.error(res, 'Invalid wallet address format', 400);
      return;
    }
    
    const user = await userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      ResponseUtil.error(res, 'User not found', 404);
      return;
    }

    const listings = await this.skinListingRepository.find({
      where: { userId: user.id },
      relations: ['userSkin', 'userSkin.skinTemplate'],
      order: { createdAt: 'DESC' },
    });

    const transformedListings = listings.map(listing => ({
      id: listing.id,
      skinName: `${listing.userSkin?.skinTemplate?.weapon || 'Unknown'} | ${listing.userSkin?.skinTemplate?.skinName || 'Unknown'}`,
      condition: 'Field-Tested', // Default condition
      rarity: listing.userSkin?.skinTemplate?.rarity || 'Common',
      price: parseFloat(listing.priceUsd),
      status: listing.status,
      listedAt: listing.createdAt,
      soldAt: listing.soldAt,
    }));

    ResponseUtil.success(res, transformedListings);
  });
}

