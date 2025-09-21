import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3002', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/loot',
  RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8899',
  ORACLE_SIGNER_SECRET: process.env.ORACLE_SIGNER_SECRET || '',
  MERKLE_SALT: process.env.MERKLE_SALT || 'dev_salt',
  JWT_SECRET: process.env.JWT_SECRET || 'devsecret',
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
} as const;
