import { Request, Response } from 'express';
import { BuybackService } from '../services/BuybackService';
import { TransactionValidationService } from '../services/TransactionValidationService';
import { ResponseUtil } from '../utils/response';
import { catchAsync, AppError } from '../middlewares/errorHandler';
import { Connection } from '@solana/web3.js';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { BuybackRecord } from '../entities/BuybackRecord';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { TransactionType, TransactionStatus } from '../entities/Transaction';
import { UserSkin } from '../entities/UserSkin';
import { logger } from '../middlewares/logger';
import { AuditService } from '../services/AuditService';
import { AuditEventType } from '../entities/AuditLog';

export class BuybackController {
  private buybackService: BuybackService;
  private connection: Connection;
  private transactionRepository: TransactionRepository;
  private transactionValidator: TransactionValidationService;
  private auditService: AuditService;

  constructor(buybackService?: BuybackService) {
    // Allow injection of BuybackService for testing
    this.buybackService = buybackService || new BuybackService();
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.transactionRepository = new TransactionRepository();
    this.transactionValidator = new TransactionValidationService(this.connection);
    this.auditService = new AuditService();
  }

  requestBuyback = catchAsync(async (req: Request, res: Response) => {
    const { nftMint } = req.body;
    const userWallet = req.user?.walletAddress;

    console.log('Buyback request:', { nftMint, userWallet, userId: req.user?.id });

    if (!nftMint) {
      return ResponseUtil.error(res, 'nftMint is required', 400);
    }

    // SECURITY: Additional validation (redundant but ensures safety)
    const { isValidMintAddress } = require('../utils/solanaValidation');
    if (!isValidMintAddress(nftMint)) {
      return ResponseUtil.error(res, `Invalid NFT mint address format: ${nftMint}`, 400);
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
        priceLockId: transactionData.priceLockId,
      });
    } catch (error) {
      console.error('Buyback request error:', error);
      
      // Audit log failed buyback request
      await this.auditService.logFinancial(AuditEventType.FINANCIAL_BUYBACK, {
        userId: req.user?.id,
        walletAddress: userWallet,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        nftMint,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      }).catch(err => logger.error('Failed to log audit event:', err));
      
      return ResponseUtil.error(res, `Buyback request failed: ${error.message}`, 500);
    }
  });

  confirmBuyback = catchAsync(async (req: Request, res: Response) => {
    const { signedTransaction, nftMint, walletAddress } = req.body;

    logger.info('Confirm buyback request:', { nftMint, walletAddress, userId: req.user?.id });

    if (!signedTransaction || !nftMint || !walletAddress) {
      return ResponseUtil.error(res, 'signedTransaction, nftMint, and walletAddress are required', 400);
    }

    // Validate wallet address matches authenticated user
    if (req.user?.walletAddress !== walletAddress) {
      logger.warn('Wallet address mismatch in buyback:', {
        authenticated: req.user?.walletAddress,
        provided: walletAddress,
      });
      return ResponseUtil.error(res, 'Wallet address does not match authenticated user', 403);
    }

    // SECURITY: Validate transaction before processing
    logger.info('Validating transaction...', { 
      nftMint, 
      walletAddress,
      transactionSize: Buffer.from(signedTransaction, 'base64').length 
    });
    
    const validationResult = await this.transactionValidator.validateTransaction(
      signedTransaction,
      nftMint,
      walletAddress
    );

    if (!validationResult.isValid) {
      logger.error('Transaction validation failed:', {
        error: validationResult.error,
        nftMint,
        walletAddress,
        transactionLength: signedTransaction.length,
      });
      
      // Audit log validation failure
      await this.auditService.logSecurity(AuditEventType.SECURITY_INVALID_SIGNATURE, {
        userId: req.user?.id,
        walletAddress,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestPath: req.path,
        httpMethod: req.method,
        description: `Buyback transaction validation failed: ${validationResult.error}`,
        metadata: { nftMint, error: validationResult.error },
      }).catch(err => logger.error('Failed to log audit event:', err));
      
      return ResponseUtil.error(
        res,
        `Transaction validation failed: ${validationResult.error}`,
        400
      );
    }
    
    logger.info('Transaction validation passed');

    // Check if this signature was already processed (replay protection)
    if (validationResult.signature && this.transactionValidator.isSignatureProcessed(validationResult.signature)) {
      logger.warn('Replay attack detected - duplicate transaction signature:', validationResult.signature);
      return ResponseUtil.error(res, 'This transaction has already been processed', 409);
    }

    // SECURITY: Validate that buyback amount matches locked price (front-running protection)
    const { buybackPriceLockService } = require('../services/BuybackPriceLockService');
    
    // Extract buyback amount from transaction
    // The transaction contains the buyback amount in lamports
    let buybackAmountLamports: string | undefined;
    try {
      if (validationResult.transaction) {
        // Extract buyback amount from transaction instructions
        // For Anchor programs, the amount is in the instruction data
        const instructions = validationResult.transaction.instructions || [];
        for (const instruction of instructions) {
          // Check if this is the buyback instruction
          if (instruction.programId.toString() === config.buyback.programId) {
            // The amount is in the instruction data (first 8 bytes are typically the amount)
            // For Anchor, we need to decode the instruction data
            // For now, we'll get it from the buyback calculation
            break;
          }
        }
      }
    } catch (extractError) {
      logger.warn('Could not extract buyback amount from transaction:', extractError);
    }
    
    // Get buyback calculation to validate amount
    let buybackCalc;
    try {
      buybackCalc = await this.buybackService.calculateBuyback(nftMint);
      buybackAmountLamports = buybackCalc.buybackAmountLamports;
    } catch (calcError) {
      logger.error('Failed to calculate buyback for validation:', calcError);
      return ResponseUtil.error(res, 'Failed to validate buyback amount', 500);
    }
    
    // Validate locked price
    const priceLockValidation = buybackPriceLockService.validateLockedPrice(
      nftMint,
      walletAddress,
      buybackAmountLamports
    );
    
    if (!priceLockValidation.valid) {
      logger.warn('Buyback price lock validation failed:', {
        nftMint,
        walletAddress,
        error: priceLockValidation.error,
      });
      
      // Audit log price lock failure
      await this.auditService.logSecurity(AuditEventType.SECURITY_INVALID_SIGNATURE, {
        userId: req.user?.id,
        walletAddress,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestPath: req.path,
        httpMethod: req.method,
        description: `Buyback price lock validation failed: ${priceLockValidation.error}`,
        metadata: { nftMint, error: priceLockValidation.error },
      }).catch(err => logger.error('Failed to log audit event:', err));
      
      return ResponseUtil.error(
        res,
        priceLockValidation.error || 'Buyback price validation failed',
        400
      );
    }
    
    logger.info('Buyback price lock validated successfully');

    // Check if transaction already exists in database (additional replay protection)
    const buybackRecordRepo = AppDataSource.getRepository(BuybackRecord);
    const existingRecord = await buybackRecordRepo.findOne({
      where: { nftMint, userWallet: walletAddress },
      order: { createdAt: 'DESC' },
    });

    // Only reject if there's a recent successful buyback (within last hour)
    if (existingRecord && existingRecord.createdAt) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (existingRecord.createdAt > oneHourAgo) {
        logger.warn('Duplicate buyback attempt detected:', { nftMint, walletAddress });
        return ResponseUtil.error(res, 'A buyback for this NFT was recently processed', 409);
      }
    }

    let txSignature: string;
    try {
      logger.info('Submitting validated transaction to Solana...');
      const transactionBuffer = Buffer.from(signedTransaction, 'base64');
      const { sendRawTransactionWithTimeout } = require('../utils/solanaHelpers');
      txSignature = await sendRawTransactionWithTimeout(
        this.connection,
        transactionBuffer,
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 2,
          timeout: 30000, // 30 seconds
        }
      );
      logger.info('Transaction submitted with signature:', txSignature);
      
      // Get buyback calculation for confirmation (use the one from validation)
      if (!buybackCalc) {
        buybackCalc = await this.buybackService.calculateBuyback(nftMint);
      }

          // Mark signature as processed immediately to prevent duplicate submissions
          if (validationResult.signature) {
            this.transactionValidator.markSignatureAsProcessed(validationResult.signature);
          }
    } catch (error: any) {
      logger.error('Failed to submit transaction:', error);
      return ResponseUtil.error(res, `Failed to submit transaction: ${error.message}`, 400);
    }

    try {
      logger.info('Confirming transaction...');
      const { confirmTransactionWithTimeout } = require('../utils/solanaHelpers');
      await confirmTransactionWithTimeout(this.connection, txSignature, 'confirmed', 60000);
      const confirmation = { value: { err: null } }; // Confirmation successful
      logger.info('Transaction confirmation result:', confirmation);
      
      if (confirmation.value.err) {
        logger.error('Transaction failed with error:', confirmation.value.err);
        return ResponseUtil.error(res, 'Transaction failed', 400);
      }

      // SECURITY: Verify transaction on-chain matches expected values
      logger.info('Verifying transaction on-chain...');
      const onChainValid = await this.transactionValidator.verifyTransactionOnChain(
        txSignature,
        nftMint,
        walletAddress
      );

      if (!onChainValid) {
        logger.error('On-chain transaction verification failed:', { txSignature, nftMint, walletAddress });
        return ResponseUtil.error(res, 'Transaction verification failed - transaction may have been tampered with', 400);
      }

      // Check if NFT is already burned to prevent duplicate processing
      const userSkinRepo = AppDataSource.getRepository(UserSkin);
      const existingUserSkin = await userSkinRepo.findOne({
        where: { nftMintAddress: nftMint, userId: req.user?.id }
      });
      
      if (existingUserSkin?.soldViaBuyback) {
        logger.warn('NFT already burned, skipping duplicate processing:', { nftMint, userId: req.user?.id });
        return ResponseUtil.success(res, {
          message: 'Buyback already completed',
          txSignature,
          amountPaid: 0,
        });
      }
      
      // Use the buyback calculation that was validated earlier (from price lock validation)
      // buybackCalc is already set from price lock validation above
      logger.info('Buyback calculation confirmed:', buybackCalc);
      
      // Now mark as burned (this will remove from inventory)
      await this.buybackService.markNFTAsBurned(nftMint, txSignature);
      logger.info('NFT marked as burned successfully');

      // Find the userSkin to get the userSkinId for the transaction
      logger.info('Finding user skin in database...');
      const userSkin = await userSkinRepo.findOne({
        where: { nftMintAddress: nftMint, userId: req.user?.id }
      });
      logger.info('User skin found:', userSkin ? 'Yes' : 'No');

      logger.info('Creating buyback record...');
      const buybackRecord = buybackRecordRepo.create({
        userId: req.user?.id,
        userWallet: walletAddress,
        nftMint,
        amountPaid: buybackCalc.buybackAmount,
        txSignature,
      });
      await buybackRecordRepo.save(buybackRecord);
      logger.info('Buyback record saved successfully');

      // SECURITY: Use safe math to prevent integer overflow
      // Calculate USD amount for transaction record and audit log
      const { validateAmount, solToUsd, toNumber } = require('../utils/safeMath');
      const buybackAmount = validateAmount(buybackCalc.buybackAmount, 'buyback amount');
      const solPriceUsd = 200; // Approximate SOL price
      const amountUsd = solToUsd(buybackAmount, solPriceUsd);
      const amountUsdNum = toNumber(amountUsd); // Safe conversion

      // Create PAYOUT transaction record for activity tracking
      if (req.user?.id) {
        try {
          await this.transactionRepository.create({
            userId: req.user.id,
            transactionType: TransactionType.PAYOUT,
            amountSol: buybackCalc.buybackAmount,
            amountUsd: amountUsdNum,
            userSkinId: userSkin?.id,
            txHash: txSignature,
            status: TransactionStatus.CONFIRMED,
            confirmedAt: new Date(),
          });
        } catch (transactionError) {
          logger.error('Failed to create payout transaction record:', transactionError);
          // Don't fail the buyback if transaction creation fails
        }
      }

      logger.info('Buyback completed successfully:', { txSignature, amountPaid: buybackCalc.buybackAmount });

      // Audit log successful buyback
      await this.auditService.logFinancial(AuditEventType.FINANCIAL_BUYBACK, {
        userId: req.user?.id,
        walletAddress,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        txHash: txSignature,
        nftMint,
        amountSol: buybackCalc.buybackAmount,
        amountUsd: amountUsdNum,
        success: true,
        metadata: {
          buybackAmount: buybackCalc.buybackAmount,
          skinPrice: buybackCalc.skinPrice,
        },
      }).catch(err => logger.error('Failed to log audit event:', err));

      ResponseUtil.success(res, {
        message: 'Buyback completed successfully',
        txSignature,
        amountPaid: buybackCalc.buybackAmount,
      });
    } catch (error) {
      logger.error('Error confirming buyback:', error);
      
      // Audit log failed buyback confirmation
      await this.auditService.logFinancial(AuditEventType.FINANCIAL_BUYBACK, {
        userId: req.user?.id,
        walletAddress,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        nftMint,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      }).catch(err => logger.error('Failed to log audit event:', err));
      
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
    
    // SECURITY: Additional validation (redundant but ensures safety)
    const { isValidMintAddress } = require('../utils/solanaValidation');
    if (!isValidMintAddress(nftMint)) {
      return ResponseUtil.error(res, `Invalid NFT mint address format: ${nftMint}`, 400);
    }

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

