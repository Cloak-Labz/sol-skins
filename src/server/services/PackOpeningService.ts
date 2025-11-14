import { TransactionRepository } from '../repositories/TransactionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { BoxRepository } from '../repositories/BoxRepository';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import { AppError } from '../middlewares/errorHandler';
import { TransactionType, TransactionStatus } from '../entities/Transaction';
import { AppDataSource } from '../config/database';
import { logger } from '../middlewares/logger';
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
    // Convert signature to base58 if needed (Solana tx signatures are base58)
    // Frontend may send base64, array string, or already base58
    let txHash: string;
    try {
      const bs58 = require('bs58');
      
      // Check if signature is a comma-separated array string (from JSON serialization)
      if (signature.includes(',') && /^\d+/.test(signature.trim())) {
        // It's an array string like "110,35,146,..." - convert to base58
        const bytes = signature.split(',').map((n: string) => parseInt(n.trim(), 10));
        if (bytes.length === 64) {
          txHash = bs58.encode(new Uint8Array(bytes));
        } else {
          logger.warn('Invalid signature array length', { length: bytes.length });
          throw new Error('Invalid signature format: array length must be 64');
        }
      } else if (signature.includes('+') || signature.includes('/') || signature.endsWith('=')) {
        // It's base64 - decode and convert to base58
        const decoded = Buffer.from(signature, 'base64');
        txHash = bs58.encode(decoded);
      } else {
        // Assume it's already base58
        txHash = signature;
      }
      
      // Validate length (Solana signatures are 64 bytes = 88 chars in base58)
      if (txHash.length > 88) {
        logger.warn('Transaction signature too long, truncating', { 
          originalLength: txHash.length,
          signature: txHash.substring(0, 20) + '...',
        });
        txHash = txHash.substring(0, 88);
      }
      
      logger.debug('Signature converted to base58', { 
        originalLength: signature.length,
        convertedLength: txHash.length,
        originalFormat: signature.includes(',') ? 'array' : signature.includes('+') || signature.includes('/') ? 'base64' : 'base58',
      });
    } catch (error) {
      logger.error('Failed to convert signature to base58', { 
        error,
        signatureLength: signature.length,
        signaturePreview: signature.substring(0, 50) + '...',
      });
      // Fallback: use signature as-is but truncate if too long
      txHash = signature.length > 88 ? signature.substring(0, 88) : signature;
    }
    try {
      // Get user and box data
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if user has trade URL (required for pack opening)
      if (!user.tradeUrl) {
        throw new AppError('Trade URL is required to open packs', 400, 'TRADE_URL_REQUIRED');
      }

      logger.info('Looking up box for pack opening', { boxId, userId });
      
      const box = await this.boxRepository.findById(boxId);
      if (!box) {
        logger.error('Box not found for pack opening', { boxId, userId });
        throw new AppError('Box not found', 404, 'BOX_NOT_FOUND');
      }

      logger.info('Box found for pack opening', {
        boxId: box.id,
        boxName: box.name,
        itemsAvailable: box.itemsAvailable,
        itemsOpened: box.itemsOpened,
        status: box.status,
      });

      // Check if box has available supply
      if (box.itemsAvailable <= 0) {
        logger.warn('Box is sold out', { boxId: box.id, boxName: box.name });
        throw new AppError('Box is sold out', 400, 'BOX_SOLD_OUT');
      }

      // Check if box is active
      if (box.status !== 'active') {
        logger.warn('Box is not active', { boxId: box.id, boxName: box.name, status: box.status });
        throw new AppError(`Box is ${box.status}`, 400, 'BOX_NOT_AVAILABLE');
      }

      // SECURITY: Validate NFT mint address format before using
      const { isValidMintAddress } = require('../utils/solanaValidation');
      if (!isValidMintAddress(nftMint)) {
        throw new AppError(`Invalid NFT mint address format: ${nftMint}`, 400);
      }
      
      // Check if user skin already exists for this NFT mint
      const existingUserSkin = await this.userSkinRepository.findOne({ nftMintAddress: nftMint });

      if (existingUserSkin) {
        logger.warn('UserSkin already exists for NFT mint, but continuing to update box supply', { 
          nftMint: nftMint.substring(0, 8) + '...',
          userSkinId: existingUserSkin.id,
        });
        // Don't return early - we still need to update box supply even if UserSkin exists
      }

      // --- PATCH: Attempt to look up box skin value via BoxSkinService ---
      let realValue = skinData.basePriceUsd;
      let matchedBoxSkin: any = null;
      try {
        const { BoxSkin } = await import('../entities/BoxSkin');
        const boxSkinRepo = AppDataSource.getRepository(BoxSkin);

        const nameParts = skinData.name.split('|').map((part) => part.trim());
        const weaponFromName = nameParts.length > 1 ? nameParts[0] : undefined;
        const skinNameOnly = nameParts.length > 1 ? nameParts[1] : undefined;

        const weaponCandidates = Array.from(
          new Set(
            [skinData.weapon, weaponFromName]
              .filter((value) => typeof value === 'string' && value.trim().length > 0)
              .map((value) => value!.trim())
          )
        );

        const nameCandidates = Array.from(
          new Set(
            [skinData.name, skinNameOnly]
              .filter((value) => typeof value === 'string' && value.trim().length > 0)
              .map((value) => value!.trim())
          )
        );

        if (weaponCandidates.length || nameCandidates.length) {
          const qb = boxSkinRepo
            .createQueryBuilder('bs')
            .where('bs.boxId = :boxId', { boxId });

          if (weaponCandidates.length) {
            qb.andWhere('LOWER(bs.weapon) IN (:...weaponCandidates)', {
              weaponCandidates: weaponCandidates.map((value) => value.toLowerCase()),
            });
          }

          if (nameCandidates.length) {
            qb.andWhere('LOWER(bs.name) IN (:...nameCandidates)', {
              nameCandidates: nameCandidates.map((value) => value.toLowerCase()),
            });
          }

          matchedBoxSkin = await qb.getOne();
        }

        if (!matchedBoxSkin && nameCandidates.length) {
          const whereClauses = nameCandidates.flatMap((name) => {
            if (weaponCandidates.length) {
              return weaponCandidates.map((weapon) => ({
                boxId,
                name,
                weapon,
              }));
            }

            return [
              {
                boxId,
                name,
              },
            ];
          });

          if (whereClauses.length) {
            matchedBoxSkin = await boxSkinRepo.findOne({
              where: whereClauses as any,
            });
          }
        }

        if (matchedBoxSkin && matchedBoxSkin.basePriceUsd != null) {
          realValue = Number(matchedBoxSkin.basePriceUsd);
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
      const finalImageUrl = resolvedImageUrl || matchedBoxSkin?.imageUrl || undefined;

      if (!finalImageUrl) {
        logger.warn('Pack opening missing imageUrl after metadata and BoxSkin lookup', {
          boxId,
          skinName: skinData.name,
          weapon: skinData.weapon,
          rarity: skinData.rarity,
          matchedBoxSkinId: matchedBoxSkin?.id,
          hasResolvedImage: Boolean(resolvedImageUrl),
        });
      } else {
        logger.debug('Pack opening resolved image', {
          boxId,
          skinName: skinData.name,
          weapon: skinData.weapon,
          resolvedFrom: resolvedImageUrl ? 'metadata' : 'boxSkin',
          matchedBoxSkinId: matchedBoxSkin?.id,
        });
      }

      // Sanitize skin name to prevent XSS
      let sanitizedSkinName: string;
      try {
        const { sanitizeSkinName } = require('../utils/sanitization');
        sanitizedSkinName = sanitizeSkinName(skinData.name);
      } catch (error) {
        // Fallback if sanitization fails (e.g., in test environment with type errors)
        sanitizedSkinName = String(skinData.name || '').replace(/[<>]/g, '');
      }

      // Try to find SkinTemplate to link it properly
      let skinTemplateId: string | undefined = undefined;
      if (skinData.name) {
        const nameParts = skinData.name.split(' | ');
        if (nameParts.length === 2) {
          const [weapon, skinName] = nameParts.map(s => s.trim());
          const { SkinTemplate, SkinRarity, SkinCondition } = await import('../entities/SkinTemplate');
          const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);
          
          // Try case-insensitive search first
          let skinTemplate = await skinTemplateRepo
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
          
          // If still not found, try to find from BoxSkin and create SkinTemplate
          if (!skinTemplate) {
            const { BoxSkin } = await import('../entities/BoxSkin');
            const boxSkinRepo = AppDataSource.getRepository(BoxSkin);
            
            // Try case-insensitive search first
            let boxSkin = await boxSkinRepo
              .createQueryBuilder('bs')
              .where('bs.boxId = :boxId', { boxId: box.id })
              .andWhere('LOWER(bs.weapon) = LOWER(:weapon)', { weapon })
              .andWhere('LOWER(bs.name) = LOWER(:name)', { name: skinData.name })
              .getOne();
            
            // If not found, try exact match
            if (!boxSkin) {
              boxSkin = await boxSkinRepo.findOne({
                where: {
                  boxId: box.id,
                  weapon: weapon,
                  name: skinData.name,
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
              
              try {
                skinTemplate = skinTemplateRepo.create({
                  weapon: weapon,
                  skinName: skinName,
                  rarity: rarityMap[boxSkin.rarity?.toLowerCase() || 'common'] || SkinRarity.COMMON,
                  condition: boxSkin.condition ? (boxSkin.condition as any) : SkinCondition.FACTORY_NEW,
                  basePriceUsd: Number(boxSkin.basePriceUsd || skinData.basePriceUsd || 0),
                  imageUrl: boxSkin.imageUrl,
                  isActive: true,
                });
                skinTemplate = await skinTemplateRepo.save(skinTemplate);
                
                const { logger } = require('../middlewares/logger');
                logger.info('Created missing SkinTemplate from BoxSkin', {
                  skinTemplateId: skinTemplate.id,
                  weapon,
                  skinName,
                  boxId: box.id,
                });
              } catch (createError: any) {
                // If creation fails (e.g., duplicate), try to find it again
                const { logger } = require('../middlewares/logger');
                logger.warn('Failed to create SkinTemplate, trying to find existing one', {
                  error: createError?.message,
                  weapon,
                  skinName,
                });
                
                skinTemplate = await skinTemplateRepo
                  .createQueryBuilder('st')
                  .where('LOWER(st.weapon) = LOWER(:weapon)', { weapon })
                  .andWhere('LOWER(st.skinName) = LOWER(:skinName)', { skinName })
                  .getOne();
              }
            }
          }
          
          if (skinTemplate) {
            skinTemplateId = skinTemplate.id;
          }
        }
      }

      // Create or update user skin
      let savedUserSkin = existingUserSkin;
      if (!existingUserSkin) {
        savedUserSkin = await this.userSkinRepository.create({
          userId,
          nftMintAddress: nftMint,
          name: sanitizedSkinName,
          metadataUri: skinData.metadataUri,
          imageUrl: finalImageUrl,
          openedAt: new Date(),
          currentPriceUsd: realValue,
          lastPriceUpdate: new Date(),
          isInInventory: true,
          symbol: 'SKIN',
          skinTemplateId: skinTemplateId,
        });
      } else {
        // Update existing user skin if skinTemplateId is missing or if we have new data
        const needsUpdate = !existingUserSkin.skinTemplateId && skinTemplateId;
        if (needsUpdate) {
          existingUserSkin.skinTemplateId = skinTemplateId;
          if (sanitizedSkinName && !existingUserSkin.name) {
            existingUserSkin.name = sanitizedSkinName;
          }
          if (finalImageUrl && !existingUserSkin.imageUrl) {
            existingUserSkin.imageUrl = finalImageUrl;
          }
          if (realValue && !existingUserSkin.currentPriceUsd) {
            existingUserSkin.currentPriceUsd = realValue;
            existingUserSkin.lastPriceUpdate = new Date();
          }
          await this.userSkinRepository.update(existingUserSkin.id, existingUserSkin);
          savedUserSkin = existingUserSkin;
        }

        if (finalImageUrl && !existingUserSkin.imageUrl) {
          existingUserSkin.imageUrl = finalImageUrl;
          await this.userSkinRepository.update(existingUserSkin.id, existingUserSkin);
          savedUserSkin = existingUserSkin;
        }
      }

      // Find or create corresponding LootBoxType for transaction foreign key
      const { LootBoxType, LootBoxRarity } = await import('../entities/LootBoxType');
      const lootBoxTypeRepo = AppDataSource.getRepository(LootBoxType);
      let lootBoxType = await lootBoxTypeRepo.findOne({ where: { name: box.name } });
      if (!lootBoxType) {
        lootBoxType = lootBoxTypeRepo.create({
          name: box.name,
          description: box.description || '',
          priceSol: Number(box.priceSol) || 0,
          priceUsdc: box.priceUsdc ? Number(box.priceUsdc) : undefined,
          rarity: LootBoxRarity.STANDARD,
        });
        await lootBoxTypeRepo.save(lootBoxType);
      }

      // Create transaction record
      const priceUsdc = box.priceUsdc ? Number(box.priceUsdc) : 0;
      const priceSol = Number(box.priceSol) || 0;
      
      const savedTransaction = await this.transactionRepository.create({
        userId,
        transactionType: TransactionType.OPEN_CASE,
        amountSol: -priceSol,
        amountUsdc: -priceUsdc,
        amountUsd: -priceUsdc, // Use USDC price for USD amount
        lootBoxTypeId: lootBoxType.id, // Use actual LootBoxType ID
        userSkinId: savedUserSkin.id,
        txHash: txHash, // Use converted base58 signature
        status: TransactionStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      // Create CaseOpening record for activity tracking
      const { CaseOpening, UserDecision } = await import('../entities/CaseOpening');
      const caseOpeningRepo = AppDataSource.getRepository(CaseOpening);
      const nameParts = sanitizedSkinName.split(' | ');
      const skinName = nameParts.length > 1 ? nameParts[1].trim() : sanitizedSkinName;
      const weapon = nameParts.length > 1 ? nameParts[0].trim() : skinData.weapon;
      
      const caseOpening = caseOpeningRepo.create({
        userId,
        lootBoxTypeId: lootBoxType.id, // Use the LootBoxType ID for pack openings
        nftMintAddress: nftMint,
        transactionId: savedTransaction.id,
        userSkinId: savedUserSkin.id,
        skinName: sanitizedSkinName,
        skinRarity: skinData.rarity,
        skinWeapon: weapon,
        skinValue: realValue,
        skinImage: finalImageUrl || '',
        isPackOpening: true,
        boxPriceSol: priceSol,
        openedAt: new Date(),
        completedAt: new Date(),
        userDecision: UserDecision.KEEP,
        decisionAt: new Date(),
      });
      await caseOpeningRepo.save(caseOpening);

      // Update user stats
      user.casesOpened = (user.casesOpened || 0) + 1;
      user.totalSpent = (user.totalSpent || 0) + priceUsdc;
      await this.userRepository.update(user.id, user);

      // Update box supply: decrement itemsAvailable and increment itemsOpened
      const newItemsAvailable = Math.max(0, box.itemsAvailable - 1);
      const newItemsOpened = (box.itemsOpened || 0) + 1;
      const newStatus = newItemsAvailable === 0 ? 'sold_out' : box.status;
      
      logger.info('Updating box supply', {
        boxId: box.id,
        boxName: box.name,
        oldItemsAvailable: box.itemsAvailable,
        newItemsAvailable,
        oldItemsOpened: box.itemsOpened,
        newItemsOpened,
        newStatus,
      });
      
      const updateResult = await this.boxRepository.update(box.id, {
        itemsAvailable: newItemsAvailable,
        itemsOpened: newItemsOpened,
        status: newStatus as 'active' | 'paused' | 'sold_out' | 'ended',
      });
      
      if (!updateResult) {
        logger.error('Failed to update box supply - box not found after update', { boxId: box.id });
        throw new AppError('Failed to update box supply', 500);
      }
      
      logger.info('Box supply updated successfully', {
        boxId: box.id,
        boxName: box.name,
        oldItemsAvailable: box.itemsAvailable,
        newItemsAvailable: updateResult.itemsAvailable,
        oldItemsOpened: box.itemsOpened,
        newItemsOpened: updateResult.itemsOpened,
        oldStatus: box.status,
        newStatus: updateResult.status,
      });

      return {
        transaction: savedTransaction,
        userSkin: savedUserSkin,
        nftMint: nftMint, // Include nftMint in response for tests
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
