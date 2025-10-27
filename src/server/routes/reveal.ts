import { Router, Request, Response } from 'express';
import { RevealService } from '../services/RevealService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';

export const revealRoutes = Router();
const revealService = new RevealService();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /reveal/status/:nftMint - Check if NFT is revealed (public)
revealRoutes.get('/status/:nftMint', catchAsync(async (req: Request, res: Response) => {
  const { nftMint } = req.params;

  const status = await revealService.getRevealStatus(nftMint);

  ResponseUtil.success(res, status);
}));

// POST /reveal/:nftMint - Manually trigger reveal (public for testing)
revealRoutes.post('/:nftMint', catchAsync(async (req: Request, res: Response) => {
  const { nftMint } = req.params;
  const { boxId } = req.body;

  if (!boxId) {
    return ResponseUtil.error(res, 'boxId is required', 400);
  }

  const result = await revealService.revealNFT(nftMint, boxId);

  ResponseUtil.success(res, result);
}));

// POST /reveal/batch - Batch reveal multiple NFTs (requires wallet)
revealRoutes.post('/batch', walletAuth.requireWallet, catchAsync(async (req: Request, res: Response) => {
  const { nftMints, boxId } = req.body;

  if (!nftMints || !Array.isArray(nftMints)) {
    return ResponseUtil.error(res, 'nftMints array is required', 400);
  }

  if (!boxId) {
    return ResponseUtil.error(res, 'boxId is required', 400);
  }

  const results = await revealService.batchReveal(nftMints, boxId);

  ResponseUtil.success(res, results);
}));

