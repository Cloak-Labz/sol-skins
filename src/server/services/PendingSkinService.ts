import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PendingSkin } from '../entities/PendingSkin';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../middlewares/logger';
import { discordService, DiscordTicketData } from './DiscordService';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { TransactionType, TransactionStatus } from '../entities/Transaction';

export interface CreatePendingSkinDTO {
  userId: string;
  skinName: string;
  skinRarity: string;
  skinWeapon: string;
  skinValue: number;
  skinImage?: string;
  nftMintAddress?: string;
  transactionHash?: string;
  caseOpeningId?: string;
  expiresAt?: Date;
}

export interface UpdatePendingSkinDTO {
  status?: 'pending' | 'claimed' | 'expired';
  claimedAt?: Date;
}

export class PendingSkinService {
  private repository: Repository<PendingSkin>;
  private transactionRepository: TransactionRepository;

  constructor() {
    this.repository = AppDataSource.getRepository(PendingSkin);
    this.transactionRepository = new TransactionRepository();
  }

  async createPendingSkin(data: CreatePendingSkinDTO): Promise<PendingSkin> {
    try {
      // Idempotency: if there's already a pending record for this user + nft mint, return it
      if (data.userId && data.nftMintAddress) {
        const existing = await this.repository.findOne({
          where: {
            userId: data.userId,
            nftMintAddress: data.nftMintAddress,
            status: 'pending',
          },
        });
        if (existing) {
          logger.info('PendingSkin already exists (idempotent return):', { id: existing.id, userId: existing.userId, nft: existing.nftMintAddress });
          return existing;
        }
      }

      const pendingSkin = this.repository.create({
        ...data,
        expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      });

      const saved = await this.repository.save(pendingSkin);
      logger.info('PendingSkin created:', { id: saved.id, userId: saved.userId, skinName: saved.skinName });
      return saved;
    } catch (error) {
      logger.error('Error creating PendingSkin:', error);
      throw new AppError('Failed to create pending skin', 500);
    }
  }

  async getPendingSkinsByUserId(userId: string): Promise<PendingSkin[]> {
    try {
      return await this.repository.find({
        where: { userId, status: 'pending' },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Error fetching pending skins:', error);
      throw new AppError('Failed to fetch pending skins', 500);
    }
  }

  async getPendingSkinById(id: string): Promise<PendingSkin> {
    try {
      const pendingSkin = await this.repository.findOne({ where: { id } });
      if (!pendingSkin) {
        throw new AppError('Pending skin not found', 404, 'PENDING_SKIN_NOT_FOUND');
      }
      return pendingSkin;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching pending skin by ID:', error);
      throw new AppError('Failed to fetch pending skin', 500);
    }
  }

  async updatePendingSkin(id: string, data: UpdatePendingSkinDTO): Promise<PendingSkin> {
    try {
      const pendingSkin = await this.getPendingSkinById(id);
      
      Object.assign(pendingSkin, data);
      const updated = await this.repository.save(pendingSkin);
      
      logger.info('PendingSkin updated:', { id, updates: Object.keys(data) });
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating pending skin:', error);
      throw new AppError('Failed to update pending skin', 500);
    }
  }

  async claimPendingSkin(id: string, userWalletAddress?: string, userTradeUrl?: string): Promise<PendingSkin> {
    try {
      const pendingSkin = await this.getPendingSkinById(id);
      
      if (pendingSkin.status !== 'pending') {
        throw new AppError('Skin is not available for claiming', 400, 'SKIN_NOT_AVAILABLE');
      }

      if (pendingSkin.expiresAt && pendingSkin.expiresAt < new Date()) {
        throw new AppError('Skin has expired', 400, 'SKIN_EXPIRED');
      }

      pendingSkin.status = 'claimed';
      pendingSkin.claimedAt = new Date();
      
      const updated = await this.repository.save(pendingSkin);
      logger.info('PendingSkin claimed:', { id, userId: pendingSkin.userId });

      // Create transaction record for activity tracking
      try {
        await this.transactionRepository.create({
          userId: pendingSkin.userId,
          transactionType: TransactionType.SKIN_CLAIMED,
          status: TransactionStatus.CONFIRMED,
          confirmedAt: new Date(),
        });
        logger.info('Transaction record created for skin claim:', { id, userId: pendingSkin.userId });
      } catch (transactionError) {
        logger.error('Failed to create transaction record for skin claim:', transactionError);
        // Don't fail the claim if transaction creation fails
      }

      // Send Discord ticket for skin claim
      if (userWalletAddress && pendingSkin.nftMintAddress) {
        try {
          const discordTicketData: DiscordTicketData = {
            userId: pendingSkin.userId,
            walletAddress: userWalletAddress,
            steamTradeUrl: userTradeUrl,
            skinName: pendingSkin.skinName,
            skinRarity: pendingSkin.skinRarity,
            skinWeapon: pendingSkin.skinWeapon,
            nftMintAddress: pendingSkin.nftMintAddress,
            openedAt: pendingSkin.createdAt,
            caseOpeningId: pendingSkin.id,
            transactionHash: pendingSkin.transactionHash,
          };

          await discordService.createSkinClaimTicket(discordTicketData);
          logger.info('Discord ticket created for skin claim:', { id, skinName: pendingSkin.skinName });
        } catch (discordError) {
          logger.error('Failed to create Discord ticket:', discordError);
          // Don't fail the claim if Discord fails
        }
      }

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error claiming pending skin:', error);
      throw new AppError('Failed to claim pending skin', 500);
    }
  }

  async deletePendingSkin(id: string): Promise<void> {
    try {
      const pendingSkin = await this.getPendingSkinById(id);
      await this.repository.remove(pendingSkin);
      logger.info('PendingSkin deleted:', { id, userId: pendingSkin.userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting pending skin:', error);
      throw new AppError('Failed to delete pending skin', 500);
    }
  }

  async deletePendingSkinByNftMint(nftMintAddress: string, walletAddress: string): Promise<void> {
    try {
      const pendingSkin = await this.repository.findOne({
        where: { 
          nftMintAddress,
          userId: walletAddress,
          status: 'pending'
        }
      });

      if (!pendingSkin) {
        logger.warn('PendingSkin not found for NFT mint:', { nftMintAddress, walletAddress });
        return; // Don't throw error, just return silently
      }

      await this.repository.remove(pendingSkin);
      logger.info('PendingSkin deleted by NFT mint:', { 
        id: pendingSkin.id, 
        nftMintAddress, 
        userId: pendingSkin.userId 
      });
    } catch (error) {
      logger.error('Error deleting pending skin by NFT mint:', error);
      throw new AppError('Failed to delete pending skin by NFT mint', 500);
    }
  }

  async getExpiredPendingSkins(): Promise<PendingSkin[]> {
    try {
      return await this.repository.find({
        where: {
          status: 'pending',
        },
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      logger.error('Error fetching expired pending skins:', error);
      throw new AppError('Failed to fetch expired pending skins', 500);
    }
  }

  async markExpiredSkins(): Promise<number> {
    try {
      const expiredSkins = await this.repository
        .createQueryBuilder('pendingSkin')
        .where('pendingSkin.status = :status', { status: 'pending' })
        .andWhere('pendingSkin.expiresAt < :now', { now: new Date() })
        .getMany();

      if (expiredSkins.length === 0) {
        return 0;
      }

      await this.repository
        .createQueryBuilder()
        .update(PendingSkin)
        .set({ status: 'expired' })
        .where('id IN (:...ids)', { ids: expiredSkins.map(skin => skin.id) })
        .execute();

      logger.info('Marked expired skins:', { count: expiredSkins.length });
      return expiredSkins.length;
    } catch (error) {
      logger.error('Error marking expired skins:', error);
      throw new AppError('Failed to mark expired skins', 500);
    }
  }

  async createSkinClaimedActivity(data: {
    userId: string;
    skinName: string;
    skinRarity: string;
    skinWeapon: string;
    nftMintAddress: string;
  }): Promise<void> {
    try {
      // Create SKIN_CLAIMED transaction directly with skin data
      await this.transactionRepository.create({
        userId: data.userId,
        transactionType: TransactionType.SKIN_CLAIMED,
        amountUsd: 0, // Required field, set to 0 for skin claims
        status: TransactionStatus.CONFIRMED,
        confirmedAt: new Date(),
        // Store skin data in the transaction for activity display
        metadata: JSON.stringify({
          skinName: data.skinName,
          skinRarity: data.skinRarity,
          skinWeapon: data.skinWeapon,
          nftMintAddress: data.nftMintAddress,
        }),
      });
      
      logger.info('Skin claimed activity created:', { userId: data.userId, skinName: data.skinName });
    } catch (error) {
      logger.error('Error creating skin claimed activity:', error);
      throw new AppError('Failed to create skin claimed activity', 500);
    }
  }
}