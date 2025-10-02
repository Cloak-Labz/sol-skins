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
} 