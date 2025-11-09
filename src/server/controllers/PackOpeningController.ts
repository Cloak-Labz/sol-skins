import { Request, Response } from 'express';
import { PackOpeningService } from '../services/PackOpeningService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export class PackOpeningController {
  private packOpeningService: PackOpeningService;
  private userService: UserService;

  constructor() {
    this.packOpeningService = new PackOpeningService();
    this.userService = new UserService();
  }

  createPackOpeningTransaction = catchAsync(async (req: Request, res: Response) => {
    const { userId, boxId, nftMint, signature, skinData } = req.body;

    const { logger } = require('../middlewares/logger');
    logger.info('Pack opening transaction request received', {
      boxId,
      userId: userId?.substring(0, 8) + '...',
      nftMint: nftMint?.substring(0, 8) + '...',
      hasSignature: !!signature,
      hasSkinData: !!skinData,
    });

    if (!userId || !boxId || !nftMint || !signature || !skinData) {
      logger.warn('Missing required fields in pack opening transaction', {
        hasUserId: !!userId,
        hasBoxId: !!boxId,
        hasNftMint: !!nftMint,
        hasSignature: !!signature,
        hasSkinData: !!skinData,
      });
      return ResponseUtil.error(res, 'Missing required fields', 400);
    }

    // SECURITY: Resolve wallet address to user ID with validation
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let actualUserId = userId;
    if (!uuidV4Regex.test(userId)) {
      // Treat as wallet address - validate format first
      const { isValidWalletAddress } = require('../utils/solanaValidation');
      if (!isValidWalletAddress(userId)) {
        return ResponseUtil.error(res, 'Invalid wallet address format', 400);
      }
      
      // Now safe to query with validated wallet address
      const user = await this.userService.findByWalletAddress(userId);
      if (!user) {
        return ResponseUtil.error(res, 'User not found', 404);
      }
      actualUserId = user.id;
    } else {
      // Validate UUID format
      if (!uuidV4Regex.test(actualUserId)) {
        return ResponseUtil.error(res, 'Invalid user ID format', 400);
      }
    }

    const result = await this.packOpeningService.createPackOpeningTransaction(
      actualUserId,
      boxId,
      nftMint,
      signature,
      skinData
    );

    ResponseUtil.success(res, result, 201);
  });

  createBuybackTransaction = catchAsync(async (req: Request, res: Response) => {
    const { userId, nftMint, buybackAmount, signature } = req.body;

    if (!userId || !nftMint || !buybackAmount || !signature) {
      return ResponseUtil.error(res, 'Missing required fields', 400);
    }

    // SECURITY: Resolve wallet address to user ID with validation
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let actualUserId = userId;
    if (!uuidV4Regex.test(userId)) {
      // Treat as wallet address - validate format first
      const { isValidWalletAddress } = require('../utils/solanaValidation');
      if (!isValidWalletAddress(userId)) {
        return ResponseUtil.error(res, 'Invalid wallet address format', 400);
      }
      
      // Now safe to query with validated wallet address
      const user = await this.userService.findByWalletAddress(userId);
      if (!user) {
        return ResponseUtil.error(res, 'User not found', 404);
      }
      actualUserId = user.id;
    } else {
      // Validate UUID format
      if (!uuidV4Regex.test(actualUserId)) {
        return ResponseUtil.error(res, 'Invalid user ID format', 400);
      }
    }

    const result = await this.packOpeningService.createBuybackTransaction(
      actualUserId,
      nftMint,
      buybackAmount,
      signature
    );

    ResponseUtil.success(res, result);
  });
}
