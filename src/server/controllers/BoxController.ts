import { Request, Response } from 'express';
import { BoxService, CreateBoxDTO, UpdateBoxDTO } from '../services/BoxService';
import { collectionFileService } from '../services/CollectionFileService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class BoxController {
  private boxService: BoxService;

  constructor() {
    this.boxService = new BoxService();
  }

  // GET /boxes - List all boxes
  getAllBoxes = catchAsync(async (req: Request, res: Response) => {
    const boxes = await this.boxService.getAllBoxes();
    ResponseUtil.success(res, boxes);
  });

  // GET /boxes/active - List active boxes
  getActiveBoxes = catchAsync(async (req: Request, res: Response) => {
    const boxes = await this.boxService.getActiveBoxes();
    ResponseUtil.success(res, boxes);
  });

  // GET /boxes/:id - Get box by ID
  getBoxById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const box = await this.boxService.getBoxById(id);
    ResponseUtil.success(res, box);
  });

  // GET /boxes/batch/:batchId - Get box by batch ID
  getBoxByBatchId = catchAsync(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    const box = await this.boxService.getBoxByBatchId(parseInt(batchId));
    ResponseUtil.success(res, box);
  });

  // POST /boxes - Create new box
  createBox = catchAsync(async (req: Request, res: Response) => {
    const data: CreateBoxDTO = req.body;
    const box = await this.boxService.createBox(data);
    ResponseUtil.success(res, box, 201);
  });

  // PUT /boxes/:id - Update box
  updateBox = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data: UpdateBoxDTO = req.body;
    const box = await this.boxService.updateBox(id, data);
    ResponseUtil.success(res, box);
  });

  // POST /boxes/:id/sync - Sync box with on-chain state
  syncBox = catchAsync(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    const box = await this.boxService.syncWithOnChain(parseInt(batchId));
    ResponseUtil.success(res, box);
  });

  // POST /boxes/sync-all - Sync all boxes with on-chain state
  syncAllBoxes = catchAsync(async (req: Request, res: Response) => {
    const result = await this.boxService.syncAllBoxes();
    ResponseUtil.success(res, result);
  });

  // DELETE /boxes/:id - Delete box
  deleteBox = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Delete collection files first
    try {
      await collectionFileService.deleteCollectionFiles(id);
    } catch (error) {
      // Log error but don't fail the deletion
      console.error('Failed to delete collection files:', error);
    }
    
    await this.boxService.deleteBox(id);
    ResponseUtil.success(res, null, 204);
  });

  // GET /boxes/:id/collection-files - Get collection files status
  getCollectionFiles = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const result = await collectionFileService.getCollectionFiles(id);
    ResponseUtil.success(res, result);
  });

  // POST /boxes/generate-collection-files - Generate collection.json and collection.png files
  generateCollectionFiles = catchAsync(async (req: Request, res: Response) => {
    const { boxId, collectionData, imageUrl } = req.body;
    
    const result = await collectionFileService.generateCollectionFiles(
      boxId,
      collectionData,
      imageUrl
    );
    
    ResponseUtil.success(res, result);
  });

  // GET /boxes/stats - Get box statistics
  getBoxStats = catchAsync(async (req: Request, res: Response) => {
    const stats = await this.boxService.getBoxStats();
    ResponseUtil.success(res, stats);
  });
}
