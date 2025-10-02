import { Request, Response } from 'express';
import { InventoryService } from '../services/InventoryService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class InventoryController {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
  }

  getInventory = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      search,
      sortBy = 'date',
      filterBy = 'all',
      page = 1,
      limit = 20,
    } = req.query;

    const result = await this.inventoryService.getUserInventory(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      sortBy: sortBy as string,
      filterBy: filterBy as string,
    });

    ResponseUtil.success(res, result);
  });

  sellSkin = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { skinId } = req.params;
    const { minAcceptablePrice } = req.body;

    const result = await this.inventoryService.sellSkinViaBuyback(
      userId,
      skinId,
      minAcceptablePrice
    );

    ResponseUtil.success(res, result);
  });

  getSkinDetails = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { skinId } = req.params;

    const skin = await this.inventoryService.getSkinDetails(userId, skinId);

    ResponseUtil.success(res, skin);
  });

  getInventoryValue = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const value = await this.inventoryService.getInventoryValue(userId);

    ResponseUtil.success(res, { totalValue: value });
  });
} 