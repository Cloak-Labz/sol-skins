import { Request, Response } from 'express';
import { PendingSkinService, CreatePendingSkinDTO, UpdatePendingSkinDTO } from '../services/PendingSkinService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class PendingSkinController {
  private pendingSkinService: PendingSkinService;

  constructor() {
    this.pendingSkinService = new PendingSkinService();
  }

  // POST /pending-skins - Create new pending skin
  createPendingSkin = catchAsync(async (req: Request, res: Response) => {
    const data: CreatePendingSkinDTO = req.body;
    const pendingSkin = await this.pendingSkinService.createPendingSkin(data);
    ResponseUtil.success(res, pendingSkin, 201);
  });

  // GET /pending-skins/user/:userId - Get pending skins for a user
  getPendingSkinsByUserId = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const pendingSkins = await this.pendingSkinService.getPendingSkinsByUserId(userId);
    ResponseUtil.success(res, pendingSkins);
  });

  // GET /pending-skins/:id - Get pending skin by ID
  getPendingSkinById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const pendingSkin = await this.pendingSkinService.getPendingSkinById(id);
    ResponseUtil.success(res, pendingSkin);
  });

  // PUT /pending-skins/:id - Update pending skin
  updatePendingSkin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data: UpdatePendingSkinDTO = req.body;
    const pendingSkin = await this.pendingSkinService.updatePendingSkin(id, data);
    ResponseUtil.success(res, pendingSkin);
  });

  // POST /pending-skins/:id/claim - Claim pending skin
  claimPendingSkin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { walletAddress, tradeUrl } = req.body;
    
    const pendingSkin = await this.pendingSkinService.claimPendingSkin(
      id, 
      walletAddress, 
      tradeUrl
    );
    ResponseUtil.success(res, pendingSkin);
  });

  // DELETE /pending-skins/:id - Delete pending skin
  deletePendingSkin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.pendingSkinService.deletePendingSkin(id);
    ResponseUtil.success(res, null, 204);
  });

  // DELETE /pending-skins/by-nft/:nftMint - Delete pending skin by NFT mint address
  deletePendingSkinByNftMint = catchAsync(async (req: Request, res: Response) => {
    const { nftMint } = req.params;
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return ResponseUtil.error(res, 'walletAddress is required', 400);
    }

    await this.pendingSkinService.deletePendingSkinByNftMint(nftMint, walletAddress);
    ResponseUtil.success(res, null, 204);
  });

  // GET /pending-skins/expired - Get expired pending skins
  getExpiredPendingSkins = catchAsync(async (req: Request, res: Response) => {
    const expiredSkins = await this.pendingSkinService.getExpiredPendingSkins();
    ResponseUtil.success(res, expiredSkins);
  });

  // POST /pending-skins/mark-expired - Mark expired skins
  markExpiredSkins = catchAsync(async (req: Request, res: Response) => {
    const count = await this.pendingSkinService.markExpiredSkins();
    ResponseUtil.success(res, { count });
  });
}