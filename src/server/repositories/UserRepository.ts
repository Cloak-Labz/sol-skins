import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { isValidWalletAddress } from '../utils/solanaValidation';
import { logger } from '../middlewares/logger';
import { findWithTimeout, getTimeoutForOperation } from '../utils/queryTimeout';

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findById(id: string): Promise<User | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      logger.warn('Invalid UUID format in findById:', id);
      throw new Error('Invalid user ID format');
    }
    // SECURITY: Apply query timeout to prevent slow query attacks
    return findWithTimeout(
      this.repository.findOne({ where: { id } }),
      getTimeoutForOperation('read'),
      'UserRepository.findById'
    );
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    // SECURITY: Validate wallet address format before query to prevent SQL injection
    if (!isValidWalletAddress(walletAddress)) {
      logger.warn('Invalid wallet address format in findByWalletAddress:', walletAddress);
      throw new Error('Invalid wallet address format');
    }
    // SECURITY: Apply query timeout to prevent slow query attacks
    return findWithTimeout(
      this.repository.findOne({ where: { walletAddress } }),
      getTimeoutForOperation('read'),
      'UserRepository.findByWalletAddress'
    );
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<void> {
    // TypeORM's update method handles null values correctly, but we need to ensure
    // that undefined values are not included (they would be ignored)
    const cleanData: any = {};
    for (const key in userData) {
      if (userData.hasOwnProperty(key) && userData[key as keyof User] !== undefined) {
        cleanData[key] = userData[key as keyof User];
      }
    }
    await this.repository.update(id, cleanData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: any;
  }): Promise<[User[], number]> {
    return this.repository.findAndCount(options);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repository.update(id, { lastLogin: new Date() });
  }

  async updateStats(id: string, stats: {
    totalSpent?: number;
    totalEarned?: number;
    casesOpened?: number;
  }): Promise<void> {
    await this.repository.update(id, stats);
  }

  async getActiveUsersCount(days: number = 30): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return this.repository.count({
      where: {
        lastLogin: date,
        isActive: true,
      },
    });
  }

  async getTotalUsersCount(): Promise<number> {
    return this.repository.count();
  }
} 