import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { AdminService } from '../services/AdminService';
import { SolanaService } from '../services/SolanaService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';
import { AppError } from '../middlewares/errorHandler';

export class AdminController {
  private adminService: AdminService;
  private solanaService: SolanaService;

  constructor() {
    this.adminService = new AdminService();
    this.solanaService = new SolanaService();
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

  // ========== SOLANA PROGRAM INTEGRATION ==========

  /**
   * Initialize the SkinVault global state
   * POST /admin/solana/initialize
   */
  initializeGlobalState = catchAsync(async (req: Request, res: Response) => {
    const { oraclePubkey, usdcMint } = req.body;

    if (!oraclePubkey || !usdcMint) {
      throw new AppError('Missing required parameters: oraclePubkey, usdcMint', 400, 'INVALID_PARAMS');
    }

    try {
      const oraclePubkeyObj = new PublicKey(oraclePubkey);
      const usdcMintObj = new PublicKey(usdcMint);

      const signature = await this.solanaService.initializeGlobalState({
        oraclePubkey: oraclePubkeyObj,
        usdcMint: usdcMintObj,
      });

      ResponseUtil.success(res, {
        signature,
        message: 'Global state initialized successfully',
      });
    } catch (error: any) {
      throw new AppError(
        `Failed to initialize global state: ${error.message}`,
        500,
        'SOLANA_ERROR'
      );
    }
  });

  /**
   * Publish a Merkle root for a new batch
   * POST /admin/solana/publish-merkle-root
   */
  publishMerkleRoot = catchAsync(async (req: Request, res: Response) => {
    const { batchId, candyMachine, metadataUris, merkleRoot, snapshotTime } = req.body;

    if (!batchId || !candyMachine || !metadataUris || !merkleRoot) {
      throw new AppError(
        'Missing required parameters: batchId, candyMachine, metadataUris, merkleRoot',
        400,
        'INVALID_PARAMS'
      );
    }

    try {
      const candyMachineObj = new PublicKey(candyMachine);
      const merkleRootArray = Array.isArray(merkleRoot) ? merkleRoot : Array.from(Buffer.from(merkleRoot, 'hex'));

      if (merkleRootArray.length !== 32) {
        throw new AppError('Merkle root must be 32 bytes', 400, 'INVALID_MERKLE_ROOT');
      }

      const signature = await this.solanaService.publishMerkleRoot({
        batchId: parseInt(batchId),
        candyMachine: candyMachineObj,
        metadataUris,
        merkleRoot: merkleRootArray,
        snapshotTime: snapshotTime || Math.floor(Date.now() / 1000),
      });

      ResponseUtil.success(res, {
        signature,
        message: 'Merkle root published successfully',
        batchId: parseInt(batchId),
      });
    } catch (error: any) {
      throw new AppError(
        `Failed to publish Merkle root: ${error.message}`,
        500,
        'SOLANA_ERROR'
      );
    }
  });

  /**
   * Create a box for a user
   * POST /admin/solana/create-box
   */
  createBox = catchAsync(async (req: Request, res: Response) => {
    const { batchId, userPubkey } = req.body;

    if (!batchId || !userPubkey) {
      throw new AppError('Missing required parameters: batchId, userPubkey', 400, 'INVALID_PARAMS');
    }

    try {
      const userPubkeyObj = new PublicKey(userPubkey);

      const signature = await this.solanaService.createBox({
        batchId: parseInt(batchId),
        userPubkey: userPubkeyObj,
      });

      const [boxPDA] = this.solanaService.getBoxPDA(userPubkeyObj);

      ResponseUtil.success(res, {
        signature,
        message: 'Box created successfully',
        boxPDA: boxPDA.toString(),
        userPubkey: userPubkey,
        batchId: parseInt(batchId),
      });
    } catch (error: any) {
      throw new AppError(
        `Failed to create box: ${error.message}`,
        500,
        'SOLANA_ERROR'
      );
    }
  });

  /**
   * Get global state
   * GET /admin/solana/global-state
   */
  getGlobalState = catchAsync(async (req: Request, res: Response) => {
    try {
      const globalState = await this.solanaService.getGlobalState();
      const [globalPDA] = this.solanaService.getGlobalPDA();

      ResponseUtil.success(res, {
        address: globalPDA.toString(),
        state: globalState,
      });
    } catch (error: any) {
      throw new AppError(
        `Failed to fetch global state: ${error.message}`,
        500,
        'SOLANA_ERROR'
      );
    }
  });

  /**
   * Get batch state
   * GET /admin/solana/batch/:batchId
   */
  getBatchState = catchAsync(async (req: Request, res: Response) => {
    const { batchId } = req.params;

    if (!batchId) {
      throw new AppError('Missing batch ID', 400, 'INVALID_PARAMS');
    }

    try {
      const batchState = await this.solanaService.getBatchState(parseInt(batchId));
      const [batchPDA] = this.solanaService.getBatchPDA(parseInt(batchId));

      ResponseUtil.success(res, {
        address: batchPDA.toString(),
        batchId: parseInt(batchId),
        state: batchState,
      });
    } catch (error: any) {
      throw new AppError(
        `Failed to fetch batch state: ${error.message}`,
        500,
        'SOLANA_ERROR'
      );
    }
  });

  /**
   * Get box state for a user
   * GET /admin/solana/box/:userPubkey
   */
  getBoxState = catchAsync(async (req: Request, res: Response) => {
    const { userPubkey } = req.params;

    if (!userPubkey) {
      throw new AppError('Missing user public key', 400, 'INVALID_PARAMS');
    }

    try {
      const userPubkeyObj = new PublicKey(userPubkey);
      const boxState = await this.solanaService.getBoxState(userPubkeyObj);
      const [boxPDA] = this.solanaService.getBoxPDA(userPubkeyObj);

      ResponseUtil.success(res, {
        address: boxPDA.toString(),
        userPubkey: userPubkey,
        state: boxState,
      });
    } catch (error: any) {
      throw new AppError(
        `Failed to fetch box state: ${error.message}`,
        500,
        'SOLANA_ERROR'
      );
    }
  });
} 