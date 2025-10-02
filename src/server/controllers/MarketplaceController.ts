import { Request, Response } from 'express';
import { LootBoxService } from '../services/LootBoxService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class MarketplaceController {
  private lootBoxService: LootBoxService;

  constructor() {
    this.lootBoxService = new LootBoxService();
  }

  getLootBoxes = catchAsync(async (req: Request, res: Response) => {
    const {
      search,
      sortBy = 'featured',
      filterBy = 'all',
      page = 1,
      limit = 20,
    } = req.query;

    const result = await this.lootBoxService.getAllLootBoxes({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      sortBy: sortBy as string,
      filterBy: filterBy as string,
    });

    ResponseUtil.success(res, result.data, 200, result.pagination);
  });

  getLootBoxById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const lootBox = await this.lootBoxService.getLootBoxById(id);
    
    ResponseUtil.success(res, lootBox);
  });

  createLootBox = catchAsync(async (req: Request, res: Response) => {
    const lootBoxData = req.body;
    const lootBox = await this.lootBoxService.createLootBox(lootBoxData);
    
    ResponseUtil.created(res, lootBox);
  });

  updateLootBox = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;
    
    await this.lootBoxService.updateLootBox(id, updateData);
    
    ResponseUtil.success(res, { message: 'Loot box updated successfully' });
  });

  deleteLootBox = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.lootBoxService.deleteLootBox(id);
    
    ResponseUtil.success(res, { message: 'Loot box deleted successfully' });
  });

  getFeatured = catchAsync(async (req: Request, res: Response) => {
    const { limit = 5 } = req.query;
    const featured = await this.lootBoxService.getFeaturedLootBoxes(parseInt(limit as string));
    
    ResponseUtil.success(res, featured);
  });
} 