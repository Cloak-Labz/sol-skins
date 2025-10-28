import { Request, Response } from 'express';
import { BuybackService } from '../services/BuybackService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';
import { Connection } from '@solana/web3.js';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { BuybackRecord } from '../entities/BuybackRecord';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { TransactionType, TransactionStatus } from '../entities/Transaction';
import { UserSkin } from '../entities/UserSkin';

export class BuybackController {
  private buybackService: BuybackService;
  private connection: Connection;
  private transactionRepository: TransactionRepository;

  constructor() {
    this.buybackService = new BuybackService();
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.transactionRepository = new TransactionRepository();
  }

  requestBuyback = catchAsync(async (req: Request, res: Response) => {
    const { nftMint } = req.body;
    const userWallet = req.user?.walletAddress;

    console.log('Buyback request:', { nftMint, userWallet, userId: req.user?.id });

    if (!nftMint) {
      return ResponseUtil.error(res, 'nftMint is required', 400);
    }

    if (!userWallet) {
      return ResponseUtil.error(res, 'User wallet not found', 401);
    }

    try {
      const isEnabled = await this.buybackService.isBuybackEnabled();
      console.log('Buyback enabled:', isEnabled);
      if (!isEnabled) {
        return ResponseUtil.error(res, 'Buyback is currently disabled', 403);
      }

      const ownsNFT = await this.buybackService.verifyNFTOwnership(nftMint, userWallet);
      console.log('NFT ownership verified:', ownsNFT);
      if (!ownsNFT) {
        return ResponseUtil.error(res, 'You do not own this NFT', 403);
      }

      const transactionData = await this.buybackService.buildBuybackTransaction(userWallet, nftMint);
      console.log('Transaction data built successfully');

      ResponseUtil.success(res, {
        transaction: transactionData.transaction,
        buybackAmount: transactionData.buybackCalculation.buybackAmount,
        buybackAmountLamports: transactionData.buybackCalculation.buybackAmountLamports,
        skinPrice: transactionData.buybackCalculation.skinPrice,
        nftMint: transactionData.buybackCalculation.nftMint,
      });
    } catch (error) {
      console.error('Buyback request error:', error);
      return ResponseUtil.error(res, `Buyback request failed: ${error.message}`, 500);
    }
  });

  confirmBuyback = catchAsync(async (req: Request, res: Response) => {
    const { signedTransaction, nftMint, walletAddress } = req.body;

    console.log('Confirm buyback request:', { nftMint, walletAddress, userId: req.user?.id });

    if (!signedTransaction || !nftMint || !walletAddress) {
      return ResponseUtil.error(res, 'signedTransaction, nftMint, and walletAddress are required', 400);
    }

    let txSignature: string;
    try {
      console.log('Submitting transaction to Solana...');
      const transactionBuffer = Buffer.from(signedTransaction, 'base64');
      txSignature = await this.connection.sendRawTransaction(transactionBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      console.log('Transaction submitted with signature:', txSignature);
    } catch (error: any) {
      console.error('Failed to submit transaction:', error);
      return ResponseUtil.error(res, `Failed to submit transaction: ${error.message}`, 400);
    }

    try {
      console.log('Confirming transaction...');
      const confirmation = await this.connection.confirmTransaction(txSignature, 'confirmed');
      console.log('Transaction confirmation result:', confirmation);
      
      if (confirmation.value.err) {
        console.error('Transaction failed with error:', confirmation.value.err);
        return ResponseUtil.error(res, 'Transaction failed', 400);
      }

      // Check if NFT is already burned to prevent duplicate processing
      const userSkinRepo = AppDataSource.getRepository(UserSkin);
      const existingUserSkin = await userSkinRepo.findOne({
        where: { nftMintAddress: nftMint, userId: req.user?.id }
      });
      
      if (existingUserSkin?.soldViaBuyback) {
        console.log('NFT already burned, skipping duplicate processing');
        return ResponseUtil.success(res, {
          message: 'Buyback already completed',
          txSignature,
          amountPaid: 0,
        });
      }
      
      // Get buyback calculation BEFORE marking as burned
      const buybackCalc = await this.buybackService.calculateBuyback(nftMint);
      console.log('Buyback calculation confirmed:', buybackCalc);
      
      // Now mark as burned (this will remove from inventory)
      await this.buybackService.markNFTAsBurned(nftMint, txSignature);
      console.log('NFT marked as burned successfully');

      // Find the userSkin to get the userSkinId for the transaction
      console.log('Finding user skin in database...');
      const userSkin = await userSkinRepo.findOne({
        where: { nftMintAddress: nftMint, userId: req.user?.id }
      });
      console.log('User skin found:', userSkin ? 'Yes' : 'No');

      console.log('Creating buyback record...');
      const buybackRecordRepo = AppDataSource.getRepository(BuybackRecord);
      const buybackRecord = buybackRecordRepo.create({
        userId: req.user?.id,
        userWallet: walletAddress,
        nftMint,
        amountPaid: buybackCalc.buybackAmount,
        txSignature,
      });
      await buybackRecordRepo.save(buybackRecord);
      console.log('Buyback record saved successfully');

      // Create PAYOUT transaction record for activity tracking
      if (req.user?.id) {
        try {
          await this.transactionRepository.create({
            userId: req.user.id,
            transactionType: TransactionType.PAYOUT,
            amountSol: buybackCalc.buybackAmount,
            amountUsd: buybackCalc.buybackAmount * 100, // Approximate SOL to USD
            userSkinId: userSkin?.id,
            txHash: txSignature,
            status: TransactionStatus.CONFIRMED,
            confirmedAt: new Date(),
          });
        } catch (transactionError) {
          console.error('Failed to create payout transaction record:', transactionError);
          // Don't fail the buyback if transaction creation fails
        }
      }

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

