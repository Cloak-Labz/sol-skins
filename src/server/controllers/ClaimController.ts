import { Request, Response } from 'express';
import { catchAsync } from '../middlewares/errorHandler';
import { ResponseUtil } from '../utils/response';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createBurnInstruction, createCloseAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { UserSkin } from '../entities/UserSkin';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { TransactionStatus, TransactionType } from '../entities/Transaction';
import { logger } from '../middlewares/logger';
import { TransactionValidationService } from '../services/TransactionValidationService';

export class ClaimController {
  private connection: Connection;
  private txRepo: TransactionRepository;
  private transactionValidator: TransactionValidationService;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.txRepo = new TransactionRepository();
    this.transactionValidator = new TransactionValidationService(this.connection);
  }

  // POST /api/v1/claim/request
  request = catchAsync(async (req: Request, res: Response) => {
    const { nftMint } = req.body as { nftMint?: string };
    const userWallet = req.user?.walletAddress;

    if (!nftMint) return ResponseUtil.error(res, 'nftMint is required', 400);
    if (!userWallet) return ResponseUtil.error(res, 'User wallet not found', 401);

    // SECURITY: Validate NFT mint address format before using
    const { isValidMintAddress } = require('../utils/solanaValidation');
    if (!isValidMintAddress(nftMint)) {
      return ResponseUtil.error(res, `Invalid NFT mint address format: ${nftMint}`, 400);
    }

    const nftMintPk = new PublicKey(nftMint);
    const userPk = new PublicKey(userWallet);
    const ata = await getAssociatedTokenAddress(nftMintPk, userPk);

    // Build burn + close ATA transaction (decimals assumed 0 for NFT)
    const burnIx = createBurnInstruction(ata, nftMintPk, userPk, 1, [], TOKEN_PROGRAM_ID);
    const closeIx = createCloseAccountInstruction(ata, userPk, userPk, [], TOKEN_PROGRAM_ID);

    const tx = new Transaction().add(burnIx, closeIx);
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPk;

    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
    return ResponseUtil.success(res, { transaction: serialized });
  });

  // POST /api/v1/claim/confirm
  confirm = catchAsync(async (req: Request, res: Response) => {
    const { signedTransaction, nftMint, walletAddress } = req.body;

    if (!signedTransaction || !nftMint || !walletAddress) {
      return ResponseUtil.error(res, 'signedTransaction, nftMint, and walletAddress are required', 400);
    }

    // SECURITY: Validate NFT mint address format before using
    const { isValidMintAddress } = require('../utils/solanaValidation');
    if (!isValidMintAddress(nftMint)) {
      return ResponseUtil.error(res, `Invalid NFT mint address format: ${nftMint}`, 400);
    }

    // Validate wallet address matches authenticated user
    if (req.user?.walletAddress && req.user.walletAddress !== walletAddress) {
      logger.warn('Wallet address mismatch in claim:', {
        authenticated: req.user?.walletAddress,
        provided: walletAddress,
      });
      return ResponseUtil.error(res, 'Wallet address does not match authenticated user', 403);
    }

    // SECURITY: Validate transaction before processing
    logger.info('Validating claim transaction...', { 
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
      logger.error('Claim transaction validation failed:', {
        error: validationResult.error,
        nftMint,
        walletAddress,
      });
      return ResponseUtil.error(res, `Transaction validation failed: ${validationResult.error}`, 400);
    }

    let txSignature: string;
    try {
      // Use validated transaction buffer
      const buf = Buffer.from(signedTransaction, 'base64');
      const { sendRawTransactionWithTimeout } = require('../utils/solanaHelpers');
      txSignature = await sendRawTransactionWithTimeout(
        this.connection,
        buf,
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 2,
          timeout: 30000,
        }
      );

      // Mark signature as processed to prevent replay
      if (validationResult.signature) {
        this.transactionValidator.markSignatureAsProcessed(validationResult.signature);
      }
    } catch (err: any) {
      logger.error('Failed to submit claim transaction:', err);
      return ResponseUtil.error(res, `Failed to submit transaction: ${err.message}`, 400);
    }

    try {
      const { confirmTransactionWithTimeout } = require('../utils/solanaHelpers');
      await confirmTransactionWithTimeout(this.connection, txSignature, 'confirmed', 60000);
      const conf = { value: { err: null } }; // Confirmation successful
      if (conf.value.err) {
        return ResponseUtil.error(res, 'Transaction failed', 400);
      }

      // Mark as claimed (remove from inventory)
      const repo = new UserSkinRepository();
      await repo.markAsClaimedByMint(req.user!.id, nftMint);

      // Optional: create transaction activity
      try {
        const userSkin = await AppDataSource.getRepository(UserSkin).findOne({ where: { nftMintAddress: nftMint, userId: req.user!.id } });
        await this.txRepo.create({
          userId: req.user!.id,
          transactionType: TransactionType.SKIN_CLAIMED,
          amountUsd: 0,
          userSkinId: userSkin?.id,
          txHash: txSignature,
          status: TransactionStatus.CONFIRMED,
          confirmedAt: new Date(),
        });
      } catch (_) {}

      return ResponseUtil.success(res, { message: 'Claim burn completed', txSignature });
    } catch (err) {
      return ResponseUtil.error(res, 'Failed to confirm transaction', 500);
    }
  });
}


