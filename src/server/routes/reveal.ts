import { Router, Request, Response } from 'express';
import { RevealService } from '../services/RevealService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';
import { WalletAuthMiddleware } from '../middlewares/walletAuth';
import { UserService } from '../services/UserService';
import { validateSchema, schemas } from '../middlewares/validation';
import { revealLimiter, batchRevealLimiter, publicEndpointsLimiter } from '../middlewares/security';

export const revealRoutes = Router();
const revealService = new RevealService();
const userService = new UserService();
const walletAuth = new WalletAuthMiddleware(userService);

// GET /reveal/status/:nftMint - Check if NFT is revealed (public)
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
revealRoutes.get('/status/:nftMint', publicEndpointsLimiter, validateSchema(schemas.nftMintParam, 'params'), catchAsync(async (req: Request, res: Response) => {
  const { nftMint } = req.params;

  // SECURITY: Additional validation (redundant but ensures safety)
  const { isValidMintAddress } = require('../utils/solanaValidation');
  if (!isValidMintAddress(nftMint)) {
    return ResponseUtil.error(res, `Invalid NFT mint address format: ${nftMint}`, 400);
  }

  const status = await revealService.getRevealStatus(nftMint);

  ResponseUtil.success(res, status);
}));

// POST /reveal/:nftMint - Manually trigger reveal (public for testing)
// SECURITY: Rate limited to prevent DoS (10 req/min)
revealRoutes.post('/:nftMint', revealLimiter, validateSchema(schemas.nftMintParam, 'params'), validateSchema(schemas.reveal), catchAsync(async (req: Request, res: Response) => {
  const { nftMint } = req.params;
  const { boxId, walletAddress } = req.body;

  // SECURITY: Additional validation (redundant but ensures safety)
  const { isValidMintAddress } = require('../utils/solanaValidation');
  if (!isValidMintAddress(nftMint)) {
    return ResponseUtil.error(res, `Invalid NFT mint address format: ${nftMint}`, 400);
  }

  const result = await revealService.revealNFT(nftMint, boxId, walletAddress);

  ResponseUtil.success(res, result);
}));

// POST /reveal/batch - Batch reveal multiple NFTs (requires wallet)
// SECURITY: Rate limited to prevent resource exhaustion (2 req/min, max 10 NFTs per batch)
revealRoutes.post('/batch', batchRevealLimiter, walletAuth.requireWalletWithSignature, validateSchema(schemas.revealBatch), catchAsync(async (req: Request, res: Response) => {
  const { nftMints, boxId } = req.body;

  // Additional batch size validation (DoS protection)
  if (nftMints.length > 10) {
    return ResponseUtil.error(res, 'Batch size cannot exceed 10 NFTs', 400);
  }

  const results = await revealService.batchReveal(nftMints, boxId);

  ResponseUtil.success(res, results);
}));

