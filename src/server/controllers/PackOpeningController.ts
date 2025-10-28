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

    if (!userId || !boxId || !nftMint || !signature || !skinData) {
      return ResponseUtil.error(res, 'Missing required fields', 400);
    }

    // Resolve wallet address to user ID if needed
    let actualUserId = userId;
    if (userId.length === 44) { // Wallet address
      const user = await this.userService.findByWalletAddress(userId);
      if (!user) {
        return ResponseUtil.error(res, 'User not found', 404);
      }
      actualUserId = user.id;
    }

    const result = await this.packOpeningService.createPackOpeningTransaction(
      actualUserId,
      boxId,
      nftMint,
      signature,
      skinData
    );

    ResponseUtil.success(res, result);
  });

  createBuybackTransaction = catchAsync(async (req: Request, res: Response) => {
    const { userId, nftMint, buybackAmount, signature } = req.body;

    if (!userId || !nftMint || !buybackAmount || !signature) {
      return ResponseUtil.error(res, 'Missing required fields', 400);
    }

    // Resolve wallet address to user ID if needed
    let actualUserId = userId;
    if (userId.length === 44) { // Wallet address
      const user = await this.userService.findByWalletAddress(userId);
      if (!user) {
        return ResponseUtil.error(res, 'User not found', 404);
      }
      actualUserId = user.id;
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
