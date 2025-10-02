import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.repository.findOne({ where: { walletAddress } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<void> {
    await this.repository.update(id, userData);
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