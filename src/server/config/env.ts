import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('/api/v1'),
  
  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  
  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRE: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRE: Joi.string().default('7d'),
  
  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // Solana
  SOLANA_RPC_URL: Joi.string().required(),
  SOLANA_WS_URL: Joi.string().required(),
  PROGRAM_ID: Joi.string().required(),
  
  // External APIs
  STEAM_API_KEY: Joi.string().allow('').default(''),
  CSGOFLOAT_API_KEY: Joi.string().allow('').default(''),
  DMARKET_API_KEY: Joi.string().allow('').default(''),
  
  // Monitoring
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().default('combined'),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  apiPrefix: envVars.API_PREFIX,
  
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    username: envVars.DB_USERNAME,
    password: envVars.DB_PASSWORD,
    database: envVars.DB_DATABASE,
    synchronize: envVars.DB_SYNCHRONIZE,
    logging: envVars.DB_LOGGING,
  },
  
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
  },
  
  jwt: {
    secret: envVars.JWT_SECRET,
    expire: envVars.JWT_EXPIRE,
    refreshExpire: envVars.JWT_REFRESH_EXPIRE,
  },
  
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    rateLimitWindowMs: envVars.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  
  solana: {
    rpcUrl: envVars.SOLANA_RPC_URL,
    wsUrl: envVars.SOLANA_WS_URL,
    programId: envVars.PROGRAM_ID,
  },
  
  externalApis: {
    steamApiKey: envVars.STEAM_API_KEY,
    csgofloatApiKey: envVars.CSGOFLOAT_API_KEY,
    dmarketApiKey: envVars.DMARKET_API_KEY,
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },
}; 