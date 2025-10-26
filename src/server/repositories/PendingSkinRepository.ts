import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PendingSkin } from '../entities/PendingSkin';

export class PendingSkinRepository {
  private repository: Repository<PendingSkin>;

  constructor() {
    this.repository = AppDataSource.getRepository(PendingSkin);
  }

  async create(data: {
    userId: string;
    skinName: string;
    skinRarity: string;
    skinWeapon: string;
    skinValue: number;
    skinImage: string;
    nftMintAddress?: string;
    transactionHash?: string;
    caseOpeningId?: string;
    expiresAt?: Date;
  }): Promise<PendingSkin> {
    const pendingSkin = this.repository.create({
      ...data,
      status: 'pending',
      expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    return await this.repository.save(pendingSkin);
  }

  async findById(id: string): Promise<PendingSkin | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<PendingSkin[]> {
    return await this.repository.find({
      where: { userId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserIdAndStatus(userId: string, status: 'pending' | 'claimed' | 'expired'): Promise<PendingSkin[]> {
    return await this.repository.find({
      where: { userId, status },
      order: { createdAt: 'DESC' },
    });
  }

  async claimSkin(id: string, userId: string): Promise<PendingSkin | null> {
    const pendingSkin = await this.repository.findOne({
      where: { id, userId, status: 'pending' },
    });

    if (!pendingSkin) {
      return null;
    }

    pendingSkin.status = 'claimed';
    pendingSkin.claimedAt = new Date();

    return await this.repository.save(pendingSkin);
  }

  async markAsExpired(id: string): Promise<void> {
    await this.repository.update(id, { status: 'expired' });
  }

  async deleteExpiredSkins(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('status = :status AND expiresAt < :now', { 
        status: 'expired', 
        now: new Date() 
      })
      .execute();

    return result.affected || 0;
  }

  async cleanupExpiredPendingSkins(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ status: 'expired' })
      .where('status = :status AND expiresAt < :now', { 
        status: 'pending', 
        now: new Date() 
      })
      .execute();

    return result.affected || 0;
  }

  async getExpiredPendingSkins(): Promise<PendingSkin[]> {
    return await this.repository.find({
      where: {
        status: 'pending',
        expiresAt: new Date(), // This will be handled by the query
      },
    });
  }
}
