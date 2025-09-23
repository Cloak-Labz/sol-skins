import { DataSource } from 'typeorm';
import { config } from './env';
import { User } from '@/entities/User';
import { LootBoxType } from '@/entities/LootBoxType';
import { SkinTemplate } from '@/entities/SkinTemplate';
import { LootBoxSkinPool } from '@/entities/LootBoxSkinPool';
import { UserSkin } from '@/entities/UserSkin';
import { Transaction } from '@/entities/Transaction';
import { CaseOpening } from '@/entities/CaseOpening';
import { PriceHistory } from '@/entities/PriceHistory';
import { UserSession } from '@/entities/UserSession';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
  entities: [
    User,
    LootBoxType,
    SkinTemplate,
    LootBoxSkinPool,
    UserSkin,
    Transaction,
    CaseOpening,
    PriceHistory,
    UserSession,
  ],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: ['src/database/subscribers/*.ts'],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
    throw error;
  }
}; 