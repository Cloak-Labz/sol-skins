import { Request, Response } from 'express';
import { BuybackService } from '../services/BuybackService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';
import { Connection } from '@solana/web3.js';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { BuybackRecord } from '../entities/BuybackRecord';

export class BuybackController {
  private buybackService: BuybackService;
  private connection: Connection;

  constructor() {
    this.buybackService = new BuybackService();
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
  }

  requestBuyback = catchAsync(async (req: Request, res: Response) => {
    const { nftMint } = req.body;
    const userWallet = req.user?.walletAddress;

    if (!nftMint) {
      return ResponseUtil.error(res, 'nftMint is required', 400);
    }

    if (!userWallet) {
      return ResponseUtil.error(res, 'User wallet not found', 401);
    }

    const isEnabled = await this.buybackService.isBuybackEnabled();
    if (!isEnabled) {
      return ResponseUtil.error(res, 'Buyback is currently disabled', 403);
    }

    const ownsNFT = await this.buybackService.verifyNFTOwnership(nftMint, userWallet);
    if (!ownsNFT) {
      return ResponseUtil.error(res, 'You do not own this NFT', 403);
    }

    const transactionData = await this.buybackService.buildBuybackTransaction(userWallet, nftMint);

    ResponseUtil.success(res, {
      transaction: transactionData.transaction,
      buybackAmount: transactionData.buybackCalculation.buybackAmount,
      buybackAmountLamports: transactionData.buybackCalculation.buybackAmountLamports,
      skinPrice: transactionData.buybackCalculation.skinPrice,
      nftMint: transactionData.buybackCalculation.nftMint,
    });
  });

  confirmBuyback = catchAsync(async (req: Request, res: Response) => {
    const { signedTransaction, nftMint, walletAddress } = req.body;

    if (!signedTransaction || !nftMint || !walletAddress) {
      return ResponseUtil.error(res, 'signedTransaction, nftMint, and walletAddress are required', 400);
    }

    let txSignature: string;
    try {
      const transactionBuffer = Buffer.from(signedTransaction, 'base64');
      txSignature = await this.connection.sendRawTransaction(transactionBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
    } catch (error: any) {
      console.error('Failed to submit transaction:', error);
      return ResponseUtil.error(res, `Failed to submit transaction: ${error.message}`, 400);
    }

    try {
      const confirmation = await this.connection.confirmTransaction(txSignature, 'confirmed');
      
      if (confirmation.value.err) {
        return ResponseUtil.error(res, 'Transaction failed', 400);
      }

      const buybackCalc = await this.buybackService.calculateBuyback(nftMint);
      await this.buybackService.markNFTAsBurned(nftMint, txSignature);

      const buybackRecordRepo = AppDataSource.getRepository(BuybackRecord);
      const buybackRecord = buybackRecordRepo.create({
        userId: req.user?.id,
        userWallet: walletAddress,
        nftMint,
        amountPaid: buybackCalc.buybackAmount,
        txSignature,
      });
      await buybackRecordRepo.save(buybackRecord);

      ResponseUtil.success(res, {
        message: 'Buyback completed successfully',
        txSignature,
        amountPaid: buybackCalc.buybackAmount,
      });
    } catch (error) {
      console.error('Error confirming buyback:', error);
      return ResponseUtil.error(
        res,
        'Failed to confirm transaction',
        500
      );
    }
  });

  /**
   * GET /api/buyback/status
   * Get buyback system status
   */
  getStatus = catchAsync(async (req: Request, res: Response) => {
    const config = await this.buybackService.getBuybackConfig();
    
    ResponseUtil.success(res, {
      enabled: config.buybackEnable,
      treasuryAddress: config.treasury.toString(),
      collectionMint: config.collectionMint.toString(),
      minTreasuryBalance: config.minTreasuryBalance.toString(),
    });
  });

  /**
   * GET /api/buyback/calculate/:nftMint
   * Calculate buyback amount for an NFT without creating transaction
   */
  calculateBuyback = catchAsync(async (req: Request, res: Response) => {
    const { nftMint } = req.params;

    const calculation = await this.buybackService.calculateBuyback(nftMint);

    ResponseUtil.success(res, calculation);
  });

  /**
   * GET /api/buyback/history
   * Get user's buyback history
   */
  getHistory = catchAsync(async (req: Request, res: Response) => {
    const userWallet = req.user?.walletAddress;

    if (!userWallet) {
      return ResponseUtil.error(res, 'User wallet not found', 401);
    }

    const buybackRecordRepo = AppDataSource.getRepository(BuybackRecord);
    const records = await buybackRecordRepo.find({
      where: { userWallet },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50 records
    });

    ResponseUtil.success(res, records);
  });
}

