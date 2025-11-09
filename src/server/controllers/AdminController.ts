import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { BoxService } from '../services/BoxService';
import { BoxController } from './BoxController';
import { BoxRepository } from '../repositories/BoxRepository';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class AdminController {
  private adminService: AdminService;
  private boxService: BoxService;
  private boxController: BoxController;

  constructor() {
    this.adminService = new AdminService();
    this.boxService = new BoxService();
    this.boxController = new BoxController();
  }

  getOverviewStats = catchAsync(async (req: Request, res: Response) => {
    const stats = await this.adminService.getOverviewStats();

    ResponseUtil.success(res, stats);
  });

  getUsersStats = catchAsync(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      order = 'DESC',
    } = req.query;

    const result = await this.adminService.getUsersStats({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as any,
      order: order as any,
    });

    ResponseUtil.success(res, { users: result.users, pagination: result.pagination });
  });

  getTransactionStats = catchAsync(async (req: Request, res: Response) => {
    const { days } = req.query;
    const stats = await this.adminService.getTransactionStats(
      days ? parseInt(days as string) : undefined
    );

    ResponseUtil.success(res, stats);
  });

  getCaseOpeningStats = catchAsync(async (req: Request, res: Response) => {
    const { days } = req.query;
    const stats = await this.adminService.getCaseOpeningStats(
      days ? parseInt(days as string) : undefined
    );

    ResponseUtil.success(res, stats);
  });

  getAnalytics = catchAsync(async (req: Request, res: Response) => {
    const { days, startDate, endDate } = req.query;
    const daysNum = days ? parseInt(days as string) : 30;
    const start = startDate ? (startDate as string) : undefined;
    const end = endDate ? (endDate as string) : undefined;
    const analytics = await this.adminService.getAnalyticsData(daysNum, start, end);

    ResponseUtil.success(res, analytics);
  });

  getCaseOpeningsTimeSeries = catchAsync(async (req: Request, res: Response) => {
    const { days, startDate, endDate } = req.query;
    const daysNum = days ? parseInt(days as string) : 30;
    const start = startDate ? (startDate as string) : undefined;
    const end = endDate ? (endDate as string) : undefined;
    const data = await this.adminService.getCaseOpeningsTimeSeries(daysNum, start, end);

    ResponseUtil.success(res, data);
  });

  getBuybacksTimeSeries = catchAsync(async (req: Request, res: Response) => {
    const { days, startDate, endDate } = req.query;
    const daysNum = days ? parseInt(days as string) : 30;
    const start = startDate ? (startDate as string) : undefined;
    const end = endDate ? (endDate as string) : undefined;
    const data = await this.adminService.getBuybacksTimeSeries(daysNum, start, end);

    ResponseUtil.success(res, data);
  });

  getTransfersTimeSeries = catchAsync(async (req: Request, res: Response) => {
    const { days, startDate, endDate } = req.query;
    const daysNum = days ? parseInt(days as string) : 30;
    const start = startDate ? (startDate as string) : undefined;
    const end = endDate ? (endDate as string) : undefined;
    const data = await this.adminService.getTransfersTimeSeries(daysNum, start, end);

    ResponseUtil.success(res, data);
  });

  getPacks = catchAsync(async (req: Request, res: Response) => {
    // Return boxes from database instead of empty array
    const boxes = await this.boxService.getAllBoxes();
    ResponseUtil.success(res, boxes);
  });

  createPack = catchAsync(async (req: Request, res: Response) => {
    try {
      const packData = req.body;
      
      // Create box data with defaults
      const boxData = {
        batchId: packData.batchId || Math.floor(Date.now() / 1000),
        candyMachine: packData.candyMachine || '11111111111111111111111111111111',
        collectionMint: packData.collectionMint || '11111111111111111111111111111111',
        name: packData.name || `Pack ${Date.now()}`,
        description: packData.description || 'A mystery pack',
        imageUrl: packData.imageUrl || '/assets/banner2.jpg',
        priceSol: packData.priceSol || 0,
        priceUsdc: packData.priceUsdc || 0,
        totalItems: packData.totalItems || 10,
        merkleRoot: packData.merkleRoot || '0'.repeat(64),
        metadataUris: packData.metadataUris || [],
        snapshotTime: Math.floor(Date.now() / 1000),
      };

      // Create box using repository directly to avoid service issues
      const boxRepo = new BoxRepository();
      
      const box = await boxRepo.create({
        ...boxData,
        itemsAvailable: boxData.totalItems,
        itemsOpened: 0,
        status: 'active',
        isSynced: true,
        lastSyncedAt: new Date(),
      });

      ResponseUtil.success(res, box, 201);
    } catch (error) {
      console.error('Error creating pack:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      ResponseUtil.error(res, `Failed to create pack: ${error.message}`, 500);
    }
  });

  // GET /admin/users/:userId - Get user details
  getUser = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const user = await this.adminService.getUserById(userId);
    
    if (!user) {
      return ResponseUtil.error(res, 'User not found', 404);
    }
    
    ResponseUtil.success(res, user);
  });

  // GET /admin/users/:userId/inventory - Get user inventory
  getUserInventory = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 50,
      filterBy,
      search,
      sortBy = 'openedAt',
      order = 'DESC'
    } = req.query;

    const result = await this.adminService.getUserInventory(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      filterBy: filterBy as string,
      search: search as string,
      sortBy: sortBy as string,
      order: order as 'ASC' | 'DESC',
    });

    ResponseUtil.success(res, { skins: result.skins, pagination: result.pagination });
  });

  // GET /admin/skins/waiting-transfer - Get all skins waiting for transfer
  getSkinsWaitingTransfer = catchAsync(async (req: Request, res: Response) => {
    const { 
      page = 1, 
      limit = 50 
    } = req.query;

    const result = await this.adminService.getSkinsWaitingTransfer({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    ResponseUtil.success(res, { skins: result.skins, pagination: result.pagination });
  });

  // PATCH /admin/skins/:skinId/status - Update skin status
  updateSkinStatus = catchAsync(async (req: Request, res: Response) => {
    const { skinId } = req.params;
    const { 
      isWaitingTransfer,
      isInInventory,
      soldViaBuyback 
    } = req.body;

    const updatedSkin = await this.adminService.updateSkinStatus(skinId, {
      isWaitingTransfer,
      isInInventory,
      soldViaBuyback,
    });

    if (!updatedSkin) {
      return ResponseUtil.error(res, 'Skin not found', 404);
    }

    ResponseUtil.success(res, updatedSkin);
  });
} 