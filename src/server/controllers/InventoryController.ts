import { Request, Response } from 'express';
import { InventoryService } from '../services/InventoryService';
import { SteamInventoryService } from '../services/SteamInventoryService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class InventoryController {
  private inventoryService: InventoryService;
  private steamInventoryService: SteamInventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
    this.steamInventoryService = new SteamInventoryService();
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

  importSteamInventory = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { steamUserId, currency = 'USD', includePrices = true } = req.body;

    if (!steamUserId) {
      ResponseUtil.error(res, 'Steam user ID is required', 400);
      return;
    }

    const result = await this.steamInventoryService.importInventory(
      userId,
      steamUserId,
      currency,
      includePrices
    );

    // Set CSV download headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="steam_inventory_${result.steamId64}_${Date.now()}.csv"`
    );

    // Return both CSV and metadata
    ResponseUtil.success(res, {
      steamId64: result.steamId64,
      itemCount: result.itemCount,
      csvData: result.csvString,
    });
  });

  getSteamInventory = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { steamId64 } = req.query;

    const items = await this.steamInventoryService.getUserSteamInventory(
      userId,
      steamId64 as string
    );

    ResponseUtil.success(res, { items });
  });

  getSteamInventoryStats = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const stats = await this.steamInventoryService.getInventoryStats(userId);

    ResponseUtil.success(res, stats);
  });
} 