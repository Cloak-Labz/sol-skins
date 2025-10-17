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

    ResponseUtil.success(res, result.users, 200, result.pagination);
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
        imageUrl: packData.imageUrl || '/assets/default-pack.png',
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
} 