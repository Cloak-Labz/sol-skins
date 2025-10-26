import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response';
import { PendingSkinService } from '../services/PendingSkinService';
import { AppError } from '../middlewares/errorHandler';

export class PendingSkinController {
  private pendingSkinService: PendingSkinService;

  constructor() {
    this.pendingSkinService = new PendingSkinService();
  }

  // Create a new pending skin
  createPendingSkin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, skinName, skinRarity, skinWeapon, skinValue, skinImage, nftMintAddress, transactionHash, caseOpeningId } = req.body;

      if (!userId || !skinName || !skinRarity || !skinWeapon || !skinValue || !skinImage) {
        ResponseUtil.error(res, 'Missing required fields', 400);
        return;
      }

      const pendingSkin = await this.pendingSkinService.createPendingSkin({
        userId,
        skinName,
        skinRarity,
        skinWeapon,
        skinValue: typeof skinValue === 'string' ? parseFloat(skinValue) : skinValue,
        skinImage,
        nftMintAddress,
        transactionHash,
        caseOpeningId,
      });

      ResponseUtil.success(res, { pendingSkin });
    } catch (error) {
      console.error('Error creating pending skin:', error);
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      ResponseUtil.error(res, 'Internal server error', 500);
    }
  };

  // Get user's pending skins
  getUserPendingSkins = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        ResponseUtil.error(res, 'User ID is required', 400);
        return;
      }

      const pendingSkins = await this.pendingSkinService.getUserPendingSkins(userId);

      ResponseUtil.success(res, { pendingSkins });
    } catch (error) {
      console.error('Error fetching user pending skins:', error);
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      ResponseUtil.error(res, 'Internal server error', 500);
    }
  };

  // Claim a pending skin
  claimPendingSkin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pendingSkinId } = req.params;
      const { userId } = req.body;

      if (!pendingSkinId || !userId) {
        ResponseUtil.error(res, 'Pending skin ID and user ID are required', 400);
        return;
      }

      const claimedSkin = await this.pendingSkinService.claimPendingSkin(pendingSkinId, userId);

      ResponseUtil.success(res, { claimedSkin });
    } catch (error) {
      console.error('Error claiming pending skin:', error);
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      ResponseUtil.error(res, 'Internal server error', 500);
    }
  };

  // Get a specific pending skin
  getPendingSkinById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        ResponseUtil.error(res, 'Pending skin ID is required', 400);
        return;
      }

      const pendingSkin = await this.pendingSkinService.getPendingSkinById(id);

      ResponseUtil.success(res, { pendingSkin });
    } catch (error) {
      console.error('Error fetching pending skin:', error);
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      ResponseUtil.error(res, 'Internal server error', 500);
    }
  };

  // Cleanup expired skins (admin endpoint)
  cleanupExpiredSkins = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.pendingSkinService.cleanupExpiredSkins();

      ResponseUtil.success(res, result);
    } catch (error) {
      console.error('Error cleaning up expired skins:', error);
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      ResponseUtil.error(res, 'Internal server error', 500);
    }
  };
}
