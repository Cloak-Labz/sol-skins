import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { UserSkin } from '../entities/UserSkin';
import { SkinTemplate } from '../entities/SkinTemplate';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import buybackIdl from '../../client/lib/idl/buyback.json';

export interface BuybackCalculation {
  nftMint: string;
  skinPrice: number;
  buybackAmount: number;
  buybackAmountLamports: string;
}

export interface BuybackTransactionData {
  transaction: string; // Base64 encoded transaction
  buybackCalculation: BuybackCalculation;
}

export class BuybackService {
  private connection: Connection;
  private program: Program;
  private adminWallet: Keypair;
  private buybackConfigPda: PublicKey;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    
    // Initialize admin wallet from private key
    const privateKeyArray = JSON.parse(config.buyback.adminWalletPrivateKey);
    this.adminWallet = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    
    // Initialize Anchor provider
    const wallet = new Wallet(this.adminWallet);
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });
    
    // Initialize program
    this.program = new Program(buybackIdl as any, provider);
    
    // Derive buyback config PDA
    const [buybackConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('buyback_config')],
      new PublicKey(config.buyback.programId)
    );
    this.buybackConfigPda = buybackConfigPda;
  }

  async calculateBuyback(nftMint: string): Promise<BuybackCalculation> {
    const userSkinRepo = new UserSkinRepository();
    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);

    const userSkin = await userSkinRepo.findByNftMintAddress(nftMint);

    if (!userSkin) {
      throw new Error('NFT not found in user inventory');
    }

    // Don't throw error if already burned - just log it
    if (userSkin.isBurnedBack) {
      console.warn('NFT has already been bought back, but returning calculation for display purposes');
    }

    const skinTemplate = userSkin.skinTemplate || await skinTemplateRepo.findOne({
      where: { id: userSkin.skinTemplateId },
    });

    if (!skinTemplate) {
      throw new Error('Skin template not found');
    }

    const skinPriceUsd = parseFloat(skinTemplate.basePriceUsd.toString());
    const solPriceUsd = 200;
    const skinPriceSol = skinPriceUsd / solPriceUsd;
    const buybackAmount = skinPriceSol * config.buyback.buybackRate;
    const buybackAmountLamports = Math.floor(buybackAmount * 1_000_000_000);

    return {
      nftMint,
      skinPrice: skinPriceSol,
      buybackAmount,
      buybackAmountLamports: buybackAmountLamports.toString(),
    };
  }

  async buildBuybackTransaction(
    userWallet: string,
    nftMint: string
  ): Promise<BuybackTransactionData> {
    const buybackCalculation = await this.calculateBuyback(nftMint);
    const nftMintPubkey = new PublicKey(nftMint);
    const userPubkey = new PublicKey(userWallet);
    const userNftAccount = await getAssociatedTokenAddress(nftMintPubkey, userPubkey);
    const buybackAmountBN = new BN(buybackCalculation.buybackAmountLamports);
    
    const tx = await this.program.methods
      .executeBuyback(buybackAmountBN)
      .accounts({
        buybackConfig: this.buybackConfigPda,
        user: userPubkey,
        treasury: this.adminWallet.publicKey,
        nftMint: nftMintPubkey,
        userNftAccount: userNftAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;

    // Admin (treasury) partially signs the transaction
    tx.partialSign(this.adminWallet);

    // Serialize transaction (with requireAllSignatures: false since user hasn't signed yet)
    const serializedTx = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return {
      transaction: serializedTx.toString('base64'),
      buybackCalculation,
    };
  }

  /**
   * Verify NFT ownership
   */
  async verifyNFTOwnership(nftMint: string, userWallet: string): Promise<boolean> {
    try {
      const nftMintPubkey = new PublicKey(nftMint);
      const userPubkey = new PublicKey(userWallet);
      const userNftAccount = await getAssociatedTokenAddress(
        nftMintPubkey,
        userPubkey
      );

      const accountInfo = await this.connection.getTokenAccountBalance(userNftAccount);
      return accountInfo.value.uiAmount === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Mark NFT as burned in database after successful buyback
   */
  async markNFTAsBurned(nftMint: string, txSignature: string): Promise<void> {
    const userSkinRepo = new UserSkinRepository();
    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);

    const userSkin = await userSkinRepo.findByNftMintAddress(nftMint);

    if (!userSkin) {
      throw new Error('NFT not found in database');
    }

    // Calculate buyback amount directly (avoid circular dependency)
    const skinTemplate = userSkin.skinTemplate || await skinTemplateRepo.findOne({
      where: { id: userSkin.skinTemplateId },
    });

    if (!skinTemplate) {
      throw new Error('Skin template not found');
    }

    const skinPriceUsd = parseFloat(skinTemplate.basePriceUsd.toString());
    const solPriceUsd = 200;
    const skinPriceSol = skinPriceUsd / solPriceUsd;
    const buybackAmount = skinPriceSol * config.buyback.buybackRate;
    
    // Mark as sold (removes from inventory) and set burn-specific fields
    await userSkinRepo.update(userSkin.id, {
      soldViaBuyback: true,
      isInInventory: false,
      buybackAmount,
      buybackAt: new Date(),
      buybackTxSignature: txSignature,
    });
  }

  /**
   * Get buyback config from on-chain
   */
  async getBuybackConfig() {
    try {
      const config = await (this.program.account as any).buyBackConfig.fetch(this.buybackConfigPda);
      return config;
    } catch (error) {
      throw new Error('Failed to fetch buyback config. Is the program initialized?');
    }
  }

  /**
   * Check if buyback is enabled
   */
  async isBuybackEnabled(): Promise<boolean> {
    try {
      const config = await this.getBuybackConfig();
      return config.buybackEnable;
    } catch (error) {
      console.warn('Failed to fetch buyback config from Solana program, defaulting to enabled:', error);
      // If we can't fetch the config, assume buyback is enabled for development
      return true;
    }
  }
}

