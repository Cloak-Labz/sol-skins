import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/loot',
  RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8899',
  ORACLE_SIGNER_SECRET: process.env.ORACLE_SIGNER_SECRET || '',
  SNAPSHOT_INTERVAL_CRON: process.env.SNAPSHOT_INTERVAL_CRON || '*/5 * * * *',
  ANCHOR_WALLET: process.env.ANCHOR_WALLET || '.anchor/id.json',
  MERKLE_SALT: process.env.MERKLE_SALT || 'dev_salt',
} as const;
