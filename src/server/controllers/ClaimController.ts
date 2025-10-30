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

export class ClaimController {
  private connection: Connection;
  private txRepo: TransactionRepository;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.txRepo = new TransactionRepository();
  }

  // POST /api/v1/claim/request
  request = catchAsync(async (req: Request, res: Response) => {
    const { nftMint } = req.body as { nftMint?: string };
    const userWallet = req.user?.walletAddress;

    if (!nftMint) return ResponseUtil.error(res, 'nftMint is required', 400);
    if (!userWallet) return ResponseUtil.error(res, 'User wallet not found', 401);

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
    const { signedTransaction, nftMint } = req.body as { signedTransaction?: string; nftMint?: string };
    if (!signedTransaction || !nftMint) {
      return ResponseUtil.error(res, 'signedTransaction and nftMint are required', 400);
    }

    let txSignature: string;
    try {
      const buf = Buffer.from(signedTransaction, 'base64');
      txSignature = await this.connection.sendRawTransaction(buf, { skipPreflight: false, preflightCommitment: 'confirmed' });
    } catch (err: any) {
      return ResponseUtil.error(res, `Failed to submit transaction: ${err.message}`, 400);
    }

    try {
      const conf = await this.connection.confirmTransaction(txSignature, 'confirmed');
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


