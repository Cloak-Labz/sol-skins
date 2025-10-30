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

      // Create user skin
      const savedUserSkin = await this.userSkinRepository.create({
        userId,
        nftMintAddress: nftMint,
        name: skinData.name,
        metadataUri: skinData.metadataUri,
        openedAt: new Date(),
        currentPriceUsd: realValue,
        lastPriceUpdate: new Date(),
        isInInventory: true,
        symbol: 'SKIN',
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

      // Create buyback transaction
      const savedTransaction = await this.transactionRepository.create({
        userId,
        transactionType: TransactionType.BUYBACK,
        amountSol: buybackAmount,
        amountUsdc: buybackAmount * 100, // Approximate SOL to USDC
        amountUsd: buybackAmount * 100,
        userSkinId: userSkin.id,
        txHash: signature,
        status: TransactionStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      // Update user skin
      await this.userSkinRepository.markAsSold(userSkin.id, buybackAmount);

      // Update user stats
      const user = await this.userRepository.findById(userId);
      if (user) {
        user.totalEarned = (user.totalEarned || 0) + (buybackAmount * 100);
        await this.userRepository.update(user.id, user);
      }

      return savedTransaction;
    } catch (error) {
      console.error('Error creating buyback transaction:', error);
      throw error;
    }
  }
}
