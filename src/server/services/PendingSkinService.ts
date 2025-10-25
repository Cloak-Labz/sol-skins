import { PendingSkinRepository } from '../repositories/PendingSkinRepository';
import { AppError } from '../middlewares/errorHandler';

export interface CreatePendingSkinData {
  userId: string;
  skinName: string;
  skinRarity: string;
  skinWeapon: string;
  skinValue: number;
  skinImage: string;
  nftMintAddress?: string;
  transactionHash?: string;
  caseOpeningId?: string;
}

export class PendingSkinService {
  private pendingSkinRepository: PendingSkinRepository;

  constructor() {
    this.pendingSkinRepository = new PendingSkinRepository();
  }

  async createPendingSkin(data: CreatePendingSkinData) {
    try {
      console.log('💾 Creating pending skin in database:', {
        userId: data.userId,
        skinName: data.skinName,
        rarity: data.skinRarity,
        value: data.skinValue
      });

      const pendingSkin = await this.pendingSkinRepository.create({
        ...data,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      console.log('✅ Pending skin created successfully:', pendingSkin.id);
      return pendingSkin;
    } catch (error: any) {
      console.error('❌ Failed to create pending skin:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw new AppError('Failed to create pending skin', 500);
    }
  }

  async getUserPendingSkins(userId: string) {
    try {
      const pendingSkins = await this.pendingSkinRepository.findByUserId(userId);
      console.log(`📦 Found ${pendingSkins.length} pending skins for user ${userId}`);
      return pendingSkins;
    } catch (error) {
      console.error('❌ Failed to fetch user pending skins:', error);
      throw new AppError('Failed to fetch pending skins', 500);
    }
  }

  async claimPendingSkin(pendingSkinId: string, userId: string) {
    try {
      console.log('🎫 Claiming pending skin:', { pendingSkinId, userId });

      const claimedSkin = await this.pendingSkinRepository.claimSkin(pendingSkinId, userId);
      
      if (!claimedSkin) {
        throw new AppError('Pending skin not found or already claimed', 404);
      }

      console.log('✅ Pending skin claimed successfully:', claimedSkin.id);
      return claimedSkin;
    } catch (error) {
      console.error('❌ Failed to claim pending skin:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to claim pending skin', 500);
    }
  }

  async getPendingSkinById(id: string) {
    try {
      const pendingSkin = await this.pendingSkinRepository.findById(id);
      if (!pendingSkin) {
        throw new AppError('Pending skin not found', 404);
      }
      return pendingSkin;
    } catch (error) {
      console.error('❌ Failed to fetch pending skin:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch pending skin', 500);
    }
  }

  async cleanupExpiredSkins() {
    try {
      console.log('🧹 Starting cleanup of expired pending skins...');
      
      // Mark expired pending skins as expired
      const expiredCount = await this.pendingSkinRepository.cleanupExpiredPendingSkins();
      console.log(`📅 Marked ${expiredCount} pending skins as expired`);

      // Delete old expired skins (older than 30 days)
      const deletedCount = await this.pendingSkinRepository.deleteExpiredSkins();
      console.log(`🗑️ Deleted ${deletedCount} old expired skins`);

      return { expiredCount, deletedCount };
    } catch (error) {
      console.error('❌ Failed to cleanup expired skins:', error);
      throw new AppError('Failed to cleanup expired skins', 500);
    }
  }
}
