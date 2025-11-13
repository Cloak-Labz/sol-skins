import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { UserSkin } from '../entities/UserSkin';
import { SkinTemplate } from '../entities/SkinTemplate';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import buybackIdl from '../lib/solana/buyback.json';
import { buybackPriceLockService } from './BuybackPriceLockService';

export interface BuybackCalculation {
  nftMint: string;
  skinPrice: number;
  buybackAmount: number;
  buybackAmountLamports: string;
}

export interface BuybackTransactionData {
  transaction: string; // Base64 encoded transaction
  buybackCalculation: BuybackCalculation;
  priceLockId: string;
}

// Interface for blockchain operations (allows mocking in tests)
export interface IBlockchainService {
  buildTransaction(userWallet: string, nftMint: string, buybackAmountLamports: string): Promise<string>;
  verifyNFTOwnership(nftMint: string, userWallet: string): Promise<boolean>;
}

export class BuybackService {
  private connection: Connection;
  private program: Program;
  private adminWallet: Keypair;
  private buybackConfigPda: PublicKey;
  private blockchainService?: IBlockchainService; // Optional: allows injection for testing

  constructor(blockchainService?: IBlockchainService) {
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
    
    // Allow injection of blockchain service for testing
    this.blockchainService = blockchainService;
  }

  async calculateBuyback(nftMint: string): Promise<BuybackCalculation> {
    // SECURITY: Validate NFT mint address format before using
    const { isValidMintAddress } = require('../utils/solanaValidation');
    if (!isValidMintAddress(nftMint)) {
      throw new Error(`Invalid NFT mint address format: ${nftMint}`);
    }
    
    const userSkinRepo = new UserSkinRepository();
    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);

    const userSkin = await userSkinRepo.findByNftMintAddress(nftMint);
    
    // If relations weren't loaded, reload with relations
    let userSkinWithRelations = userSkin;
    if (userSkin && (!userSkin.lootBoxType || !userSkin.skinTemplate)) {
      userSkinWithRelations = await userSkinRepo.findById(userSkin.id);
    }
    const finalUserSkin = userSkinWithRelations || userSkin;

    if (!finalUserSkin) {
      const { AppError } = require('../middlewares/errorHandler');
      throw new AppError('NFT not found in user inventory', 404, 'NFT_NOT_FOUND');
    }

    // Don't throw error if already burned - just log it
    if (finalUserSkin.isBurnedBack) {
      console.warn('NFT has already been bought back, but returning calculation for display purposes');
    }

    let skinTemplate = finalUserSkin.skinTemplate;
    
    // Try to load skin template if not already loaded
    if (!skinTemplate && finalUserSkin.skinTemplateId) {
      skinTemplate = await skinTemplateRepo.findOne({
        where: { id: finalUserSkin.skinTemplateId },
      });
    }

    // If still not found, try to find by name (fallback) - case insensitive
    if (!skinTemplate && finalUserSkin.name) {
      const nameParts = finalUserSkin.name.split(' | ');
      if (nameParts.length === 2) {
        const [weapon, skinName] = nameParts.map(s => s.trim());
        
        // Try case-insensitive search using query builder
        skinTemplate = await skinTemplateRepo
          .createQueryBuilder('st')
          .where('LOWER(st.weapon) = LOWER(:weapon)', { weapon })
          .andWhere('LOWER(st.skinName) = LOWER(:skinName)', { skinName })
          .getOne();
        
        // If still not found, try exact match (case sensitive)
        if (!skinTemplate) {
          skinTemplate = await skinTemplateRepo.findOne({
            where: {
              weapon: weapon,
              skinName: skinName,
            },
          });
        }
        
        // If found, update the UserSkin with the skinTemplateId
        if (skinTemplate && finalUserSkin.id) {
          await userSkinRepo.update(finalUserSkin.id, { skinTemplateId: skinTemplate.id });
        }
      }
    }
    
    // Last resort: try to create SkinTemplate from UserSkin data if we have enough info
    if (!skinTemplate && finalUserSkin.name && finalUserSkin.currentPriceUsd) {
      const nameParts = finalUserSkin.name.split(' | ');
      if (nameParts.length === 2) {
        const [weapon, skinName] = nameParts.map(s => s.trim());
        const { SkinRarity, SkinCondition } = await import('../entities/SkinTemplate');
        
        // Try to get rarity from BoxSkin or default to Common
        let rarity = SkinRarity.COMMON;
        let boxSkin = null;
        
        // Try to find BoxSkin - lootBoxTypeId might be the boxId
        if (finalUserSkin.lootBoxTypeId) {
          const { BoxSkin } = await import('../entities/BoxSkin');
          const boxSkinRepo = AppDataSource.getRepository(BoxSkin);
          
          // Try to find BoxSkin by matching weapon and name (case-insensitive)
          boxSkin = await boxSkinRepo
            .createQueryBuilder('bs')
            .where('bs.boxId = :boxId', { boxId: finalUserSkin.lootBoxTypeId })
            .andWhere('LOWER(bs.weapon) = LOWER(:weapon)', { weapon })
            .andWhere('LOWER(bs.name) = LOWER(:name)', { name: finalUserSkin.name })
            .getOne();
          
          // If not found, try exact match
          if (!boxSkin) {
            boxSkin = await boxSkinRepo.findOne({
              where: {
                boxId: finalUserSkin.lootBoxTypeId,
                weapon: weapon,
                name: finalUserSkin.name,
              },
            });
          }
          
          if (boxSkin) {
            // Map BoxSkin rarity to SkinTemplate rarity
            const rarityMap: Record<string, any> = {
              'common': SkinRarity.COMMON,
              'uncommon': SkinRarity.UNCOMMON,
              'rare': SkinRarity.RARE,
              'epic': SkinRarity.EPIC,
              'legendary': SkinRarity.LEGENDARY,
            };
            rarity = rarityMap[boxSkin.rarity?.toLowerCase() || 'common'] || SkinRarity.COMMON;
          }
        }
        
        // Create SkinTemplate if it doesn't exist
        try {
          skinTemplate = skinTemplateRepo.create({
            weapon: weapon,
            skinName: skinName,
            rarity: rarity,
            condition: boxSkin?.condition ? (boxSkin.condition as any) : SkinCondition.FACTORY_NEW,
            basePriceUsd: Number(finalUserSkin.currentPriceUsd) || (boxSkin ? Number(boxSkin.basePriceUsd) : 0),
            imageUrl: finalUserSkin.imageUrl || boxSkin?.imageUrl,
            isActive: true,
          });
          skinTemplate = await skinTemplateRepo.save(skinTemplate);
          
          // Update UserSkin with the new skinTemplateId
          if (finalUserSkin.id) {
            await userSkinRepo.update(finalUserSkin.id, { skinTemplateId: skinTemplate.id });
          }
          
          const { logger } = require('../middlewares/logger');
          logger.info('Created missing SkinTemplate from UserSkin', {
            skinTemplateId: skinTemplate.id,
            weapon,
            skinName,
            userSkinId: finalUserSkin.id,
            fromBoxSkin: !!boxSkin,
          });
        } catch (createError: any) {
          // If creation fails (e.g., duplicate), try to find it again
          const { logger } = require('../middlewares/logger');
          logger.warn('Failed to create SkinTemplate, trying to find existing one', {
            error: createError?.message,
            weapon,
            skinName,
          });
          
          // Try one more time with case-insensitive search
          skinTemplate = await skinTemplateRepo
            .createQueryBuilder('st')
            .where('LOWER(st.weapon) = LOWER(:weapon)', { weapon })
            .andWhere('LOWER(st.skinName) = LOWER(:skinName)', { skinName })
            .getOne();
        }
      }
    }

    if (!skinTemplate) {
      const { logger } = require('../middlewares/logger');
      logger.error('Skin template not found for UserSkin', {
        userSkinId: finalUserSkin.id,
        nftMint: nftMint,
        skinName: finalUserSkin.name,
        skinTemplateId: finalUserSkin.skinTemplateId,
        lootBoxTypeId: finalUserSkin.lootBoxTypeId,
      });
      throw new Error(`Skin template not found for skin: ${finalUserSkin.name || 'Unknown'} (NFT: ${nftMint})`);
    }

    // SECURITY: Use safe math to prevent integer overflow
    const { validateAmount, usdToSol, applyPercentage, solToLamports, toNumber } = require('../utils/safeMath');
    const { priceService } = require('./PriceService');
    
    // Determine the most accurate USD price we have for this skin
    const priceCandidates = [
      finalUserSkin.currentPriceUsd != null ? Number(finalUserSkin.currentPriceUsd) : null,
      skinTemplate?.basePriceUsd != null ? Number(skinTemplate.basePriceUsd) : null,
    ].filter((value): value is number => value != null && Number.isFinite(value) && value > 0);

    if (priceCandidates.length === 0) {
      throw new Error('Unable to determine skin USD price for buyback calculation');
    }

    const effectivePriceUsd = priceCandidates[0]; // prefer currentPriceUsd if available
    const skinPriceUsd = validateAmount(effectivePriceUsd, 'skin price USD');
    // Fetch live SOL price in USD (cached, with safe fallbacks)
    const solPriceUsd = validateAmount(await priceService.getSolPriceUsd(), 'SOL price USD');
    const skinPriceSol = usdToSol(skinPriceUsd, solPriceUsd);
    const buybackAmount = applyPercentage(skinPriceSol, config.buyback.buybackRate * 100, 'buyback amount'); // Convert rate to percentage
    const buybackAmountLamports = solToLamports(buybackAmount);
    
    // Convert to numbers for return (validated)
    const skinPriceSolNum = toNumber(skinPriceSol);
    const buybackAmountNum = toNumber(buybackAmount);

    return {
      nftMint,
      skinPrice: skinPriceSolNum,
      buybackAmount: buybackAmountNum,
      buybackAmountLamports: buybackAmountLamports,
    };
  }

  async buildBuybackTransaction(
    userWallet: string,
    nftMint: string
  ): Promise<BuybackTransactionData> {
    // SECURITY: Validate NFT mint address format before using
    const { isValidMintAddress } = require('../utils/solanaValidation');
    if (!isValidMintAddress(nftMint)) {
      throw new Error(`Invalid NFT mint address format: ${nftMint}`);
    }
    
    const buybackCalculation = await this.calculateBuyback(nftMint);
    
    // SECURITY: Lock the buyback price to prevent front-running
    const priceLockId = buybackPriceLockService.lockPrice(
      nftMint,
      userWallet,
      buybackCalculation.buybackAmount,
      buybackCalculation.buybackAmountLamports,
      buybackCalculation.skinPrice
    );
    
    // Use injected blockchain service if available (for testing), otherwise use real implementation
    let transaction: string;
    if (this.blockchainService) {
      transaction = await this.blockchainService.buildTransaction(
        userWallet,
        nftMint,
        buybackCalculation.buybackAmountLamports
      );
    } else {
      transaction = await this.buildSolanaTransaction(
        userWallet,
        nftMint,
        buybackCalculation.buybackAmountLamports
      );
    }
    
    return {
      transaction,
      buybackCalculation,
      priceLockId,
    };
  }

  /**
   * Build actual Solana transaction (production implementation)
   */
  private async buildSolanaTransaction(
    userWallet: string,
    nftMint: string,
    buybackAmountLamports: string
  ): Promise<string> {
    const nftMintPubkey = new PublicKey(nftMint);
    const userPubkey = new PublicKey(userWallet);
    const userNftAccount = await getAssociatedTokenAddress(nftMintPubkey, userPubkey);
    const buybackAmountBN = new BN(buybackAmountLamports);
    
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

    return serializedTx.toString('base64');
  }

  /**
   * Verify NFT ownership
   */
  async verifyNFTOwnership(nftMint: string, userWallet: string): Promise<boolean> {
    // SECURITY: Validate NFT mint address format before using
    const { isValidMintAddress } = require('../utils/solanaValidation');
    if (!isValidMintAddress(nftMint)) {
      throw new Error(`Invalid NFT mint address format: ${nftMint}`);
    }
    
    // Use injected blockchain service if available (for testing), otherwise use real implementation
    if (this.blockchainService) {
      return await this.blockchainService.verifyNFTOwnership(nftMint, userWallet);
    }
    
    return await this.verifyNFTOwnershipOnChain(nftMint, userWallet);
  }

  /**
   * Verify NFT ownership on-chain (production implementation)
   */
  private async verifyNFTOwnershipOnChain(nftMint: string, userWallet: string): Promise<boolean> {
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
    // SECURITY: Validate NFT mint address format before using
    const { isValidMintAddress } = require('../utils/solanaValidation');
    if (!isValidMintAddress(nftMint)) {
      throw new Error(`Invalid NFT mint address format: ${nftMint}`);
    }
    
    const userSkinRepo = new UserSkinRepository();
    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);

    const userSkin = await userSkinRepo.findByNftMintAddress(nftMint);
    
    // If relations weren't loaded, reload with relations
    let userSkinWithRelations = userSkin;
    if (userSkin && (!userSkin.lootBoxType || !userSkin.skinTemplate)) {
      userSkinWithRelations = await userSkinRepo.findById(userSkin.id);
    }
    const finalUserSkin = userSkinWithRelations || userSkin;

    if (!finalUserSkin) {
      throw new Error('NFT not found in database');
    }

    // Calculate buyback amount directly (avoid circular dependency)
    let skinTemplate = finalUserSkin.skinTemplate;
    
    // Try to load skin template if not already loaded
    if (!skinTemplate && finalUserSkin.skinTemplateId) {
      skinTemplate = await skinTemplateRepo.findOne({
        where: { id: finalUserSkin.skinTemplateId },
      });
    }

    // If still not found, try to find by name (fallback) - case insensitive
    if (!skinTemplate && finalUserSkin.name) {
      const nameParts = finalUserSkin.name.split(' | ');
      if (nameParts.length === 2) {
        const [weapon, skinName] = nameParts.map(s => s.trim());
        
        // Try case-insensitive search
        skinTemplate = await skinTemplateRepo
          .createQueryBuilder('st')
          .where('LOWER(st.weapon) = LOWER(:weapon)', { weapon })
          .andWhere('LOWER(st.skinName) = LOWER(:skinName)', { skinName })
          .getOne();
        
        // If not found, try exact match
        if (!skinTemplate) {
          skinTemplate = await skinTemplateRepo.findOne({
            where: {
              weapon: weapon,
              skinName: skinName,
            },
          });
        }
      }
    }

    if (!skinTemplate) {
      const { logger } = require('../middlewares/logger');
      logger.error('Skin template not found for UserSkin (confirmBuyback)', {
        userSkinId: finalUserSkin.id,
        nftMint: finalUserSkin.nftMintAddress,
        skinName: finalUserSkin.name,
        skinTemplateId: finalUserSkin.skinTemplateId,
        lootBoxTypeId: finalUserSkin.lootBoxTypeId,
      });
      throw new Error(`Skin template not found for skin: ${finalUserSkin.name || 'Unknown'}`);
    }

    // SECURITY: Use safe math to prevent integer overflow
    const { validateAmount, usdToSol, applyPercentage, toNumber } = require('../utils/safeMath');
    const { priceService } = require('./PriceService');
    
    const priceCandidates = [
      finalUserSkin.currentPriceUsd != null ? Number(finalUserSkin.currentPriceUsd) : null,
      skinTemplate?.basePriceUsd != null ? Number(skinTemplate.basePriceUsd) : null,
    ].filter((value): value is number => value != null && Number.isFinite(value) && value > 0);

    if (priceCandidates.length === 0) {
      throw new Error('Unable to determine skin USD price for buyback finalization');
    }

    const effectivePriceUsd = priceCandidates[0];
    const skinPriceUsd = validateAmount(effectivePriceUsd, 'skin price USD');
    // Fetch live SOL price in USD (cached, with safe fallbacks)
    const solPriceUsd = validateAmount(await priceService.getSolPriceUsd(), 'SOL price USD');
    const skinPriceSol = usdToSol(skinPriceUsd, solPriceUsd);
    const buybackAmount = applyPercentage(skinPriceSol, config.buyback.buybackRate * 100, 'buyback amount');
    
    // Convert Decimal to number for database storage
    const buybackAmountNum = toNumber(buybackAmount);
    
    // Mark as sold (removes from inventory) and set burn-specific fields
    await userSkinRepo.update(finalUserSkin.id, {
      soldViaBuyback: true,
      isInInventory: false,
      buybackAmount: buybackAmountNum,
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
