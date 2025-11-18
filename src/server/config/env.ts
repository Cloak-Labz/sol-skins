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
  
  
  // JWT
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .custom((value, helpers) => {
      // SECURITY: Ensure JWT secret is cryptographically strong
      // Check for common weak patterns
      if (value.length < 32) {
        return helpers.error('string.min');
      }
      
      // Warn about weak secrets (but don't fail in development)
      const weakPatterns = ['secret', 'password', '12345', 'admin', 'jwt'];
      const lowerValue = value.toLowerCase();
      const hasWeakPattern = weakPatterns.some(pattern => lowerValue.includes(pattern));
      
      if (hasWeakPattern && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET contains weak patterns. Use a cryptographically random secret.');
      }
      
      return value;
    })
    .messages({
      'string.min': 'JWT_SECRET must be at least 32 characters long for security',
    }),
  JWT_EXPIRE: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRE: Joi.string().default('7d'),
  
  // Security
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(200), // Increased from 100 to 200
  
  // CORS - Allowed origins (comma-separated, no wildcards allowed)
  ALLOWED_ORIGINS: Joi.string()
    .optional()
    .custom((value, helpers) => {
      if (!value) return value; // Optional, will use defaults
      
      const origins = value.split(',').map(o => o.trim()).filter(Boolean);
      
      // SECURITY: Never allow wildcards in production
      if (process.env.NODE_ENV === 'production') {
        const hasWildcard = origins.some(origin => 
          origin.includes('*') || 
          origin === '*' || 
          origin === 'null' || 
          origin === 'undefined'
        );
        
        if (hasWildcard) {
          throw new Error('CORS wildcards are not allowed in production. Use explicit origins only.');
        }
      }
      
      // Validate each origin is a valid URL
      for (const origin of origins) {
        try {
          const url = new URL(origin);
          // Only allow http and https
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error(`Invalid origin protocol: ${origin}. Only http:// and https:// are allowed.`);
          }
        } catch (error) {
          throw new Error(`Invalid origin format: ${origin}. Must be a valid URL.`);
        }
      }
      
      return value;
    }),
  
  // Solana
  SOLANA_RPC_URL: Joi.string().required(),
  
  // Buyback Program
  BUYBACK_PROGRAM_ID: Joi.string().required(),
  ADMIN_WALLET_PRIVATE_KEY: Joi.string()
    .required()
    .custom((value, helpers) => {
      // SECURITY: Validate private key format but never log the value
      try {
        // Should be a JSON array string
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed) || parsed.length < 32) {
          return helpers.error('string.base');
        }
        // Valid format, but value is never logged
        return value;
      } catch {
        // Not JSON, might be base58 - still valid
        if (value.length < 32) {
          return helpers.error('string.min');
        }
        return value;
      }
    })
    .messages({
      'string.base': 'ADMIN_WALLET_PRIVATE_KEY must be a valid JSON array or base58 string',
      'string.min': 'ADMIN_WALLET_PRIVATE_KEY appears to be invalid',
    }),
  BUYBACK_RATE: Joi.number().default(0.85),
  // USDC Mint (devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
  USDC_MINT: Joi.string().optional(),
  
  // Admin authorization (public addresses only - no private keys)
  ADMIN_WALLETS: Joi.string()
    .allow('')
    .default('')
    .custom((value, helpers) => {
      if (!value) return value; // Empty is allowed (no admins)
      const addresses = value.split(',').map(a => a.trim()).filter(Boolean);
      // Basic validation: Solana addresses are base58 and 32-44 chars
      for (const addr of addresses) {
        if (addr.length < 32 || addr.length > 44) {
          return helpers.error('string.pattern.base');
        }
      }
      return value;
    })
    .messages({
      'string.pattern.base': 'ADMIN_WALLETS must be comma-separated valid Solana addresses',
    }),
  
  // External APIs
  STEAM_API_KEY: Joi.string().allow('').default(''),
  CSGOFLOAT_API_KEY: Joi.string().allow('').default(''),
  DMARKET_API_KEY: Joi.string().allow('').default(''),
  
  // Discord Integration
  DISCORD_BOT_TOKEN: Joi.string().allow('').default(''),
  DISCORD_TICKET_CHANNEL_ID: Joi.string().allow('').default(''),
  DISCORD_GUILD_ID: Joi.string().allow('').default(''),
  
  // Monitoring
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
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
  
  
  jwt: {
    secret: envVars.JWT_SECRET,
    expire: envVars.JWT_EXPIRE,
    refreshExpire: envVars.JWT_REFRESH_EXPIRE,
  },
  
  security: {
    rateLimitWindowMs: envVars.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  
  solana: {
    rpcUrl: envVars.SOLANA_RPC_URL,
  },
  
  buyback: {
    programId: envVars.BUYBACK_PROGRAM_ID,
    adminWalletPrivateKey: envVars.ADMIN_WALLET_PRIVATE_KEY,
    buybackRate: envVars.BUYBACK_RATE,
    usdcMint: envVars.USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC default
  },
  
  admin: {
    wallets: (envVars.ADMIN_WALLETS || '')
      .split(',')
      .map((addr: string) => addr.trim())
      .filter((addr: string) => addr.length > 0),
  },
  
  externalApis: {
    steamApiKey: envVars.STEAM_API_KEY,
    csgofloatApiKey: envVars.CSGOFLOAT_API_KEY,
    dmarketApiKey: envVars.DMARKET_API_KEY,
  },
  
  discord: {
    botToken: envVars.DISCORD_BOT_TOKEN,
    ticketChannelId: envVars.DISCORD_TICKET_CHANNEL_ID,
    guildId: envVars.DISCORD_GUILD_ID,
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
  },
}; 