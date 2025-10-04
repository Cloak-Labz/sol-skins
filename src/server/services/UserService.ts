import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { AppDataSource } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../middlewares/logger';

export class UserService {
  private userRepository: Repository<User>;
  private sessionRepository: Repository<UserSession>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.sessionRepository = AppDataSource.getRepository(UserSession);
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id },
        relations: ['skins', 'transactions'],
      });
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw new AppError('Failed to find user', 500);
    }
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { walletAddress },
        relations: ['skins', 'transactions'],
      });
      return user; // Returns null if not found, which is expected
    } catch (error) {
      logger.error('Error finding user by wallet address:', error);
      throw new AppError('Failed to find user', 500);
    }
  }

  async createUser(walletAddress: string, username?: string): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.findByWalletAddress(walletAddress);
      if (existingUser) {
        throw new AppError('User already exists', 409, 'USER_EXISTS');
      }

      const user = this.userRepository.create({
        walletAddress,
        username,
        lastLogin: new Date(),
      });

      const savedUser = await this.userRepository.save(user);
      
      logger.info('User created:', {
        userId: savedUser.id,
        walletAddress: savedUser.walletAddress,
      });

      return savedUser;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      
      // Handle unique constraint violation (in case of race condition)
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        logger.warn('User already exists (race condition):', { walletAddress });
        throw new AppError('User already exists', 409, 'USER_EXISTS');
      }
      
      logger.error('Error creating user:', error);
      throw new AppError('Failed to create user', 500);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Prevent updating sensitive fields
      const allowedUpdates = ['username', 'email'];
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          (obj as any)[key] = (updates as any)[key];
          return obj;
        }, {} as Partial<User>);

      await this.userRepository.update(id, {
        ...filteredUpdates,
        updatedAt: new Date(),
      });

      const updatedUser = await this.findById(id);
      return updatedUser!;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating user:', error);
      throw new AppError('Failed to update user', 500);
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.userRepository.update(id, {
        lastLogin: new Date(),
      });
    } catch (error) {
      logger.error('Error updating last login:', error);
      // Don't throw error for last login update failure
    }
  }

  async updateUserStats(userId: string, stats: {
    totalSpent?: number;
    totalEarned?: number;
    casesOpened?: number;
  }): Promise<void> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const updates: Partial<User> = {};
      
      if (stats.totalSpent !== undefined) {
        updates.totalSpent = user.totalSpent + stats.totalSpent;
      }
      
      if (stats.totalEarned !== undefined) {
        updates.totalEarned = user.totalEarned + stats.totalEarned;
      }
      
      if (stats.casesOpened !== undefined) {
        updates.casesOpened = user.casesOpened + stats.casesOpened;
      }

      await this.userRepository.update(userId, updates);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating user stats:', error);
      throw new AppError('Failed to update user stats', 500);
    }
  }

  async deactivateUser(id: string): Promise<void> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      await this.userRepository.update(id, {
        isActive: false,
        updatedAt: new Date(),
      });

      // Deactivate all user sessions
      await this.sessionRepository.update(
        { userId: id },
        { isActive: false }
      );

      logger.info('User deactivated:', { userId: id });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deactivating user:', error);
      throw new AppError('Failed to deactivate user', 500);
    }
  }

  async createSession(userId: string, walletAddress: string, token: string, expiresAt: Date): Promise<UserSession> {
    try {
      const session = this.sessionRepository.create({
        userId,
        walletAddress,
        sessionToken: token,
        expiresAt,
      });

      return await this.sessionRepository.save(session);
    } catch (error) {
      logger.error('Error creating session:', error);
      throw new AppError('Failed to create session', 500);
    }
  }

  async findSession(token: string): Promise<UserSession | null> {
    try {
      return await this.sessionRepository.findOne({
        where: { 
          sessionToken: token,
          isActive: true,
        },
        relations: ['user'],
      });
    } catch (error) {
      logger.error('Error finding session:', error);
      return null;
    }
  }

  async deactivateSession(token: string): Promise<void> {
    try {
      await this.sessionRepository.update(
        { sessionToken: token },
        { isActive: false }
      );
    } catch (error) {
      logger.error('Error deactivating session:', error);
      // Don't throw error for session deactivation failure
    }
  }

  async deactivateAllUserSessions(userId: string): Promise<void> {
    try {
      await this.sessionRepository.update(
        { userId },
        { isActive: false }
      );
    } catch (error) {
      logger.error('Error deactivating user sessions:', error);
      // Don't throw error for session deactivation failure
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.sessionRepository
        .createQueryBuilder()
        .delete()
        .where('expires_at < :now', { now: new Date() })
        .execute();
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }

  async getUserStats(userId: string): Promise<{
    totalSpent: number;
    totalEarned: number;
    casesOpened: number;
    skinsOwned: number;
    netProfit: number;
  }> {
    try {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.skins', 'skins', 'skins.isInInventory = :inInventory', { inInventory: true })
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      return {
        totalSpent: user.totalSpent,
        totalEarned: user.totalEarned,
        casesOpened: user.casesOpened,
        skinsOwned: user.skins?.length || 0,
        netProfit: user.totalEarned - user.totalSpent,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting user stats:', error);
      throw new AppError('Failed to get user stats', 500);
    }
  }

  async getUsersCount(): Promise<number> {
    try {
      return await this.userRepository.count();
    } catch (error) {
      logger.error('Error getting users count:', error);
      throw new AppError('Failed to get users count', 500);
    }
  }

  async getActiveUsersCount(days: number = 30): Promise<number> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);

      return await this.userRepository
        .createQueryBuilder('user')
        .where('user.lastLogin >= :date', { date })
        .getCount();
    } catch (error) {
      logger.error('Error getting active users count:', error);
      throw new AppError('Failed to get active users count', 500);
    }
  }
} 