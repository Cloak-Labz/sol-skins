import { TransactionRepository } from '../repositories/TransactionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { BoxRepository } from '../repositories/BoxRepository';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import { AppError } from '../middlewares/errorHandler';
import { TransactionType, TransactionStatus } from '../entities/Transaction';
import { AppDataSource } from '../config/database';
import { UserSkin } from '../entities/UserSkin';
import { User } from '../entities/User';
import { Box } from '../entities/Box';
import axios from 'axios';

export interface PackOpeningResult {
  nftMint: string;
  signature: string;
  skin: {
    id: string;
    name: string;
    weapon: string;
    rarity: string;
    condition: string;
    imageUrl?: string;
    basePriceUsd: number;
    metadataUri?: string;
  };
}

export class PackOpeningService {
  private transactionRepository: TransactionRepository;
  private userRepository: UserRepository;
  private boxRepository: BoxRepository;
  private userSkinRepository: UserSkinRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.userRepository = new UserRepository();
    this.boxRepository = new BoxRepository();
    this.userSkinRepository = new UserSkinRepository();
  }

  async createPackOpeningTransaction(
    userId: string,
    boxId: string,
    nftMint: string,
    signature: string,
    skinData: {
      name: string;
      weapon: string;
      rarity: string;
      basePriceUsd: number;
      metadataUri?: string;
    }
  ) {
    try {
      // Get user and box data
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const box = await this.boxRepository.findById(boxId);
      if (!box) {
        throw new AppError('Box not found', 404, 'BOX_NOT_FOUND');
      }

      // SECURITY: Validate NFT mint address format before using
      const { isValidMintAddress } = require('../utils/solanaValidation');
      if (!isValidMintAddress(nftMint)) {
        throw new AppError(`Invalid NFT mint address format: ${nftMint}`, 400);
      }
      
      // Check if user skin already exists for this NFT mint
      const existingUserSkin = await this.userSkinRepository.findOne({ nftMintAddress: nftMint });

      if (existingUserSkin) {
        console.log('UserSkin already exists for NFT mint:', nftMint);
        return existingUserSkin;
      }

      // --- PATCH: Attempt to look up box skin value via BoxSkinService ---
      let realValue = skinData.basePriceUsd;
      try {
        const boxSkinRepo = AppDataSource.getRepository(require('../entities/BoxSkin').BoxSkin);
        // Try matching all: boxId, name, weapon, rarity (case-insensitive)
        const match = await boxSkinRepo.findOne({
          where: {
            boxId,
            name: skinData.name,
            weapon: skinData.weapon,
            rarity: skinData.rarity,
          }
        });
        if (match && match.basePriceUsd != null) {
          realValue = Number(match.basePriceUsd);
        }
      } catch (err) {
        // fallback: log but do not block
        console.error('Failed to look up box skin value:', err);
      }

      // Try resolve image URL from metadata (if provided) with SSRF protection
      let resolvedImageUrl: string | undefined;
      if (skinData.metadataUri) {
        try {
          // Validate metadata URI before fetching
          const { validateUrlForSSRF } = require('../utils/ssrfProtection');
          const metadataValidation = validateUrlForSSRF(skinData.metadataUri, {
            requireHttps: true,
            allowArweave: true,
            allowIpfs: true,
          });

          if (metadataValidation.isValid && metadataValidation.sanitizedUrl) {
            const safeMetadataUri = metadataValidation.sanitizedUrl;
            const metaResp = await axios.get(safeMetadataUri, { timeout: 8000 });
            let img: string | undefined = metaResp.data?.image;
            
            if (img) {
              // Validate image URL before using it
              if (img.startsWith('ipfs://')) {
                const ipfsValidation = validateUrlForSSRF(img, {
                  requireHttps: true,
                  allowIpfs: true,
                });
                if (ipfsValidation.isValid && ipfsValidation.sanitizedUrl) {
                  img = ipfsValidation.sanitizedUrl;
                } else {
                  const { logger } = require('../middlewares/logger');
                  logger.warn('Invalid IPFS image URL, skipping:', img);
                  img = undefined;
                }
              } else if (/^https?:\/\//.test(img)) {
                const imgValidation = validateUrlForSSRF(img, {
                  requireHttps: true,
                  allowIpfs: true,
                  allowArweave: true,
                });
                if (imgValidation.isValid && imgValidation.sanitizedUrl) {
                  img = imgValidation.sanitizedUrl;
                } else {
                  const { logger } = require('../middlewares/logger');
                  logger.warn('Invalid image URL, skipping:', img);
                  img = undefined;
                }
              } else {
                img = undefined;
              }
            }
            
            if (img) {
              resolvedImageUrl = img;
            }
          } else {
            const { logger } = require('../middlewares/logger');
            logger.warn('Invalid metadata URI, skipping metadata fetch:', metadataValidation.error);
          }
        } catch (error) {
          const { logger } = require('../middlewares/logger');
          logger.warn('Failed to fetch metadata or validate image URL:', error);
          // ignore; optional best-effort
        }
      }

      // Sanitize skin name to prevent XSS
      const { sanitizeSkinName } = require('../utils/sanitization');
      const sanitizedSkinName = sanitizeSkinName(skinData.name);

      // Try to find SkinTemplate to link it properly
      let skinTemplateId: string | undefined = undefined;
      if (skinData.name) {
        const nameParts = skinData.name.split(' | ');
        if (nameParts.length === 2) {
          const [weapon, skinName] = nameParts.map(s => s.trim());
          const { SkinTemplate } = await import('../entities/SkinTemplate');
          const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);
          const skinTemplate = await skinTemplateRepo.findOne({
            where: {
              weapon: weapon,
              skinName: skinName,
            },
          });
          if (skinTemplate) {
            skinTemplateId = skinTemplate.id;
          }
        }
      }

      // Create user skin
      const savedUserSkin = await this.userSkinRepository.create({
        userId,
        nftMintAddress: nftMint,
        name: sanitizedSkinName,
        metadataUri: skinData.metadataUri,
        imageUrl: resolvedImageUrl,
        openedAt: new Date(),
        currentPriceUsd: realValue,
        lastPriceUpdate: new Date(),
        isInInventory: true,
        symbol: 'SKIN',
        skinTemplateId: skinTemplateId,
      });

      // Create transaction record
      const savedTransaction = await this.transactionRepository.create({
        userId,
        transactionType: TransactionType.OPEN_CASE,
        amountSol: -box.priceSol,
        amountUsdc: -box.priceUsdc,
        amountUsd: -box.priceUsdc, // Use USDC price for USD amount
        lootBoxTypeId: boxId, // Use boxId as lootBoxTypeId for compatibility
        userSkinId: savedUserSkin.id,
        txHash: signature,
        status: TransactionStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      // Update user stats
      user.casesOpened = (user.casesOpened || 0) + 1;
      user.totalSpent = (user.totalSpent || 0) + box.priceUsdc;
      await this.userRepository.update(user.id, user);

      return {
        transaction: savedTransaction,
        userSkin: savedUserSkin,
      };
    } catch (error) {
      console.error('Error creating pack opening transaction:', error);
      throw error;
    }
  }

  async createBuybackTransaction(
    userId: string,
    nftMint: string,
    buybackAmount: number,
    signature: string
  ) {
    try {
      // Get user skin
      const userSkin = await this.userSkinRepository.findOne({
        where: { nftMintAddress: nftMint, userId },
      });

      if (!userSkin) {
        throw new AppError('User skin not found', 404, 'USER_SKIN_NOT_FOUND');
      }

      // SECURITY: Use safe math to prevent integer overflow
      const { validateAmount, solToUsd, safeAdd, toNumber } = require('../utils/safeMath');
      const Decimal = require('decimal.js').default;
      
      const buybackAmountDecimal = validateAmount(buybackAmount, 'buyback amount');
      const solPriceUsd = 200; // Approximate SOL price
      const amountUsd = solToUsd(buybackAmountDecimal, solPriceUsd);
      
      // Create buyback transaction
      const savedTransaction = await this.transactionRepository.create({
        userId,
        transactionType: TransactionType.BUYBACK,
        amountSol: toNumber(buybackAmountDecimal),
        amountUsdc: toNumber(amountUsd), // USDC ≈ USD
        amountUsd: toNumber(amountUsd),
        userSkinId: userSkin.id,
        txHash: signature,
        status: TransactionStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      // Update user skin
      await this.userSkinRepository.markAsSold(userSkin.id, toNumber(buybackAmountDecimal));

      // Update user stats (safe addition)
      const user = await this.userRepository.findById(userId);
      if (user) {
        const currentTotal = new Decimal(user.totalEarned || 0);
        const newTotal = safeAdd(currentTotal, amountUsd, 'total earned');
        user.totalEarned = toNumber(newTotal);
        await this.userRepository.update(user.id, user);
      }

      return savedTransaction;
    } catch (error) {
      console.error('Error creating buyback transaction:', error);
      throw error;
    }
  }
}
