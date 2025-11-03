import { Request, Response } from 'express';
import { CaseOpeningService } from '../services/CaseOpeningService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class CasesController {
  private caseOpeningService: CaseOpeningService;

  constructor() {
    this.caseOpeningService = new CaseOpeningService();
  }

  openCase = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { lootBoxTypeId, paymentMethod } = req.body;

    const result = await this.caseOpeningService.openCase(userId, {
      lootBoxTypeId,
      paymentMethod,
    });

    ResponseUtil.success(res, result);
  });

  getOpeningStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const status = await this.caseOpeningService.getCaseOpeningStatus(userId, id);

    ResponseUtil.success(res, status);
  });

  makeDecision = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { decision } = req.body;

    const result = await this.caseOpeningService.makeDecision(userId, id, decision);

    ResponseUtil.success(res, result);
  });

  getUserCaseOpenings = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const result = await this.caseOpeningService.getUserCaseOpenings(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    ResponseUtil.success(res, result.data, 200, result.pagination);
  });

  // New endpoint for pack opening records
  createPackOpeningRecord = catchAsync(async (req: Request, res: Response) => {
    const { 
      userId, 
      lootBoxTypeId, 
      nftMintAddress, 
      transactionId, 
      skinName, 
      skinRarity, 
      skinWeapon, 
      skinValue, 
      skinImage,
      isPackOpening 
    } = req.body;

    if (!userId || !nftMintAddress || !transactionId) {
      return ResponseUtil.error(res, 'Missing required fields (userId, nftMintAddress, transactionId)', 400);
    }

    const result = await this.caseOpeningService.createPackOpeningRecord({
      userId,
      lootBoxTypeId: lootBoxTypeId || '', // Can be empty for pack openings
      nftMintAddress,
      transactionId,
      skinName,
      skinRarity,
      skinWeapon,
      skinValue,
      skinImage,
      isPackOpening: isPackOpening || false,
    });

    ResponseUtil.success(res, result);
  });
} 