import { Request, Response, NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";
import Joi from "joi";
import { AppError } from "./errorHandler";
import { validateWalletAddress, validateMintAddress } from "../utils/solanaValidation";

// Express validator middleware
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((error) => error.msg)
      .join(", ");
    return next(new AppError(errorMessages, 400, "VALIDATION_ERROR"));
  }
  next();
};

// Joi validation middleware
export const validateSchema = (
  schema: Joi.ObjectSchema,
  source: "body" | "query" | "params" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let data =
      source === "body"
        ? req.body
        : source === "query"
        ? req.query
        : req.params;

    // For body validation, check if walletAddress is in header and add to body if missing
    if (source === "body" && !data.walletAddress) {
      const headerWalletAddress = req.headers['x-wallet-address'] as string;
      if (headerWalletAddress) {
        data = { ...data, walletAddress: headerWalletAddress };
      }
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return next(new AppError(errorMessage, 400, "VALIDATION_ERROR"));
    }

    // Replace the original data with validated and sanitized data
    if (source === "body") req.body = value;
    else if (source === "query") req.query = value;
    else req.params = value;

    next();
  };
};

// Common validation schemas
export const schemas = {
  // Auth schemas
  connectWallet: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
        'string.min': 'Wallet address must be at least 32 characters',
        'string.max': 'Wallet address must be at most 44 characters',
      }),
    signature: Joi.string().optional(),
    message: Joi.string().optional(),
    nonce: Joi.string().min(8).max(255).optional(),
    timestamp: Joi.number().integer().optional(),
  }),

  updateProfile: Joi.object({
    username: Joi.string()
      .min(3)
      .max(50)
      .pattern(/^[a-zA-Z0-9_\- ]+$/)
      .optional(),
    email: Joi.string()
      .email()
      .max(255)
      .optional(),
    tradeUrl: Joi.string()
      .uri()
      .pattern(/^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+/i)
      .optional(),
  }),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Marketplace schemas
  lootBoxesQuery: Joi.object({
    search: Joi.string().optional(),
    sortBy: Joi.string()
      .valid("featured", "price-low", "price-high", "name")
      .default("featured"),
    filterBy: Joi.string()
      .valid("all", "standard", "premium", "special", "limited", "legendary")
      .default("all"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Case opening schemas
  openCase: Joi.object({
    lootBoxTypeId: Joi.string().uuid().required(),
    paymentMethod: Joi.string().valid("SOL", "USDC").default("SOL"),
  }),

  caseDecision: Joi.object({
    decision: Joi.string().valid("keep", "buyback").required(),
  }),

  // Inventory schemas
  inventoryQuery: Joi.object({
    search: Joi.string().optional(),
    sortBy: Joi.string()
      .valid("date", "price-high", "price-low", "name", "rarity")
      .default("date"),
    filterBy: Joi.string()
      .valid("all", "common", "uncommon", "rare", "epic", "legendary")
      .default("all"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  buyback: Joi.object({
    minAcceptablePrice: Joi.number().positive().optional(),
  }),

  // Removed mint schema per request

  // Transaction history schemas
  transactionsQuery: Joi.object({
    search: Joi.string().optional(),
    type: Joi.string()
      .valid("all", "open_case", "buyback", "payout")
      .default("all"),
    sortBy: Joi.string()
      .valid("date", "amount-high", "amount-low")
      .default("date"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Leaderboard schemas
  leaderboardQuery: Joi.object({
    period: Joi.string()
      .valid("all-time", "monthly", "weekly")
      .default("all-time"),
    metric: Joi.string()
      .valid("inventory-value", "cases-opened", "profit")
      .default("inventory-value"),
    limit: Joi.number().integer().min(1).max(1000).default(100),
  }),

  // Activity schemas

  // Buyback schemas
  buybackRequest: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    nftMint: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    nonce: Joi.string().min(8).max(255).required(),
    timestamp: Joi.number().integer().required(),
  }),

  buybackConfirm: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    nftMint: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    signedTransaction: Joi.string()
      .base64()
      .max(13653) // ~10KB base64 encoded (10240 * 4/3 = 13653)
      .required()
      .custom((value, helpers) => {
        // Validate base64 format
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(value)) {
          return helpers.error('string.base64');
        }
        // Validate estimated binary size
        const estimatedSize = (value.length * 3) / 4;
        if (estimatedSize > 10240) {
          return helpers.error('string.max');
        }
        return value;
      }),
    nonce: Joi.string().min(8).max(255).required(),
    timestamp: Joi.number().integer().required(),
  }),

  // Pack opening schemas
  packOpeningTransaction: Joi.object({
    userId: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().min(32).max(44).custom(validateWalletAddress)
    ).required(),
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .optional()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    boxId: Joi.string().uuid().required(),
    nftMint: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    signature: Joi.string().required(), // Transaction signature from NFT mint
    skinData: Joi.object({
      name: Joi.string().required(),
      weapon: Joi.string().optional(),
      rarity: Joi.string().required(),
      basePriceUsd: Joi.number().min(0).optional(),
      metadataUri: Joi.string().uri().optional(),
    }).required(),
    nonce: Joi.string().min(8).max(255).required(),
    timestamp: Joi.number().integer().required(),
  }),

  packOpeningBuyback: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    nftMint: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    signature: Joi.string().required(),
    message: Joi.string().required(),
    nonce: Joi.string().min(8).max(255).required(),
    timestamp: Joi.number().integer().required(),
  }),

  // Reveal schemas
  reveal: Joi.object({
    boxId: Joi.string().uuid().required(),
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .optional()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
  }),

  revealBatch: Joi.object({
    nftMints: Joi.array()
      .items(Joi.string().min(32).max(44).custom(validateMintAddress))
      .min(1)
      .max(10) // SECURITY: Limit batch size to prevent resource exhaustion (DoS protection)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
        'array.max': 'Batch size cannot exceed 10 NFTs',
      }),
    boxId: Joi.string().uuid().required(),
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    signature: Joi.string().optional(),
    message: Joi.string().optional(),
  }),

  // Claim schemas
  claimRequest: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    nftMint: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    signature: Joi.string().required(),
    message: Joi.string().required(),
  }),

  claimConfirm: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    nftMint: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    signedTransaction: Joi.string()
      .base64()
      .max(13653) // ~10KB base64 encoded
      .required()
      .custom((value, helpers) => {
        // Validate base64 format
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(value)) {
          return helpers.error('string.base64');
        }
        // Validate estimated binary size
        const estimatedSize = (value.length * 3) / 4;
        if (estimatedSize > 10240) {
          return helpers.error('string.max');
        }
        return value;
      }),
    signature: Joi.string().required(),
    message: Joi.string().required(),
  }),

  // Skin marketplace schemas
  listSkin: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    skinId: Joi.string().uuid().required(),
    price: Joi.number().positive().required(),
    signature: Joi.string().required(),
    message: Joi.string().required(),
  }),

  buySkin: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    signature: Joi.string().required(),
    message: Joi.string().required(),
    nonce: Joi.string().min(8).max(255).required(),
    timestamp: Joi.number().integer().required(),
  }),

  // Inventory schemas
  claimByMint: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    nftMint: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    signature: Joi.string().required(),
    message: Joi.string().required(),
  }),

  importSteam: Joi.object({
    walletAddress: Joi.string().min(32).max(44).required(),
    signature: Joi.string().required(),
    message: Joi.string().required(),
  }),

  // Metadata schemas
  createMetadata: Joi.object({
    json: Joi.object().required().messages({
      'object.base': 'JSON must be a valid object',
      'any.required': 'JSON is required',
    }),
  }),

  metadataId: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'Metadata ID must be a valid UUID',
      'any.required': 'Metadata ID is required',
    }),
  }),

  // Discord schemas
  createTicket: Joi.object({
    userId: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().min(32).max(44).custom(validateWalletAddress)
    ).optional(),
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    steamTradeUrl: Joi.string()
      .uri()
      .pattern(/^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+/i)
      .optional()
      .allow('', null),
    skinName: Joi.string().min(1).max(255).required(),
    skinRarity: Joi.string()
      .valid('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')
      .optional()
      .custom((value, helpers) => {
        // Normalize to capitalized format
        if (value) {
          const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
          return capitalized;
        }
        return value;
      }),
    skinWeapon: Joi.string().min(1).max(100).optional(),
    nftMintAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .optional()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    openedAt: Joi.date().optional(),
    caseOpeningId: Joi.string().optional().custom((value, helpers) => {
      // Allow UUID or custom format (e.g., "pack-1234567890")
      if (!value) return value;
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(value)) return value;
      // Allow custom format like "pack-1234567890"
      if (/^pack-\d+$/.test(value)) return value;
      return helpers.error('string.custom');
    }).messages({
      'string.custom': 'caseOpeningId must be a valid UUID or custom format (e.g., "pack-1234567890")',
    }),
    transactionHash: Joi.string().optional(),
    skinImage: Joi.string().uri().optional(),
  }),

  // Pending skins schemas
  createPendingSkin: Joi.object({
    userId: Joi.string().uuid().required(),
    skinName: Joi.string().min(1).max(255).required(),
    skinRarity: Joi.string().valid('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic').required(),
    skinWeapon: Joi.string().min(1).max(100).required(),
    skinValue: Joi.number().positive().required(),
    skinImage: Joi.string().uri().optional(),
    nftMintAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .optional()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
    transactionHash: Joi.string().min(32).max(88).optional(),
    caseOpeningId: Joi.string().optional().custom((value, helpers) => {
      // Allow UUID or custom format (e.g., "pack-1234567890")
      if (!value) return value;
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(value)) return value;
      // Allow custom format like "pack-1234567890"
      if (/^pack-\d+$/.test(value)) return value;
      return helpers.error('string.custom');
    }).messages({
      'string.custom': 'caseOpeningId must be a valid UUID or custom format (e.g., "pack-1234567890")',
    }),
    expiresAt: Joi.date().optional(),
  }),

  updatePendingSkin: Joi.object({
    status: Joi.string().valid('pending', 'claimed', 'expired').optional(),
    claimedAt: Joi.date().optional(),
  }),

  claimPendingSkin: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    tradeUrl: Joi.string()
      .uri()
      .pattern(/^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+/i)
      .optional(),
  }),

  deletePendingSkinByNft: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
  }),

  createSkinClaimedActivity: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    nftMintAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
      }),
  }),

  // Activity schemas
  activityQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    type: Joi.string().valid('all', 'buyback', 'pack_opening', 'payout', 'skin_claimed').default('all'),
  }),

  // Skin marketplace query schemas
  skinMarketplaceQuery: Joi.object({
    search: Joi.string().max(255).optional(),
    sortBy: Joi.string().valid('newest', 'price-low', 'price-high').default('newest'),
    filterBy: Joi.string().valid('all', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic').default('all'),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),

  // Skin marketplace list schema (adjust to match controller)
  listSkinBody: Joi.object({
    walletAddress: Joi.string()
      .min(32)
      .max(44)
      .custom(validateWalletAddress)
      .required()
      .messages({
        'string.walletAddress': 'Invalid Solana wallet address format',
      }),
    userSkinId: Joi.string().uuid().required(),
    priceUsd: Joi.number()
      .positive()
      .max(999999999999999) // Max safe integer range (prevents overflow)
      .messages({
        'number.max': 'Price exceeds maximum safe value',
        'number.positive': 'Price must be positive',
      })
      .required(),
    signature: Joi.string().required(),
    message: Joi.string().required(),
    nonce: Joi.string().min(8).max(255).required(),
    timestamp: Joi.number().integer().required(),
  }),

  // Admin schemas
  updateSkinStatus: Joi.object({
    isWaitingTransfer: Joi.boolean().optional(),
    isInInventory: Joi.boolean().optional(),
    soldViaBuyback: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  // Irys schemas
  irysUpload: Joi.object({
    metadata: Joi.object()
      .required()
      .max(10) // Max 10 properties at root level (DoS protection)
      .custom((value, helpers) => {
        // Validate metadata using fileValidation utility
        const { validateMetadata, sanitizeMetadata } = require('../utils/fileValidation');
        const validation = validateMetadata(value);
        
        if (!validation.valid) {
          return helpers.error('any.custom', { message: validation.error });
        }
        
        // Sanitize metadata (remove dangerous properties)
        return sanitizeMetadata(value);
      })
      .messages({
        'object.base': 'Metadata must be a valid object',
        'any.required': 'Metadata is required',
        'object.max': 'Metadata has too many root properties (max 10)',
      }),
  }),

  irysTxId: Joi.object({
    txId: Joi.string().min(32).max(88).required().messages({
      'string.min': 'Transaction ID must be at least 32 characters',
      'string.max': 'Transaction ID must be at most 88 characters',
      'any.required': 'Transaction ID is required',
    }),
  }),

  // UUID param validation
  uuidParam: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'ID must be a valid UUID',
      'any.required': 'ID is required',
    }),
  }),

  userIdParam: Joi.object({
    userId: Joi.string().uuid().required().messages({
      'string.guid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required',
    }),
  }),

  listingIdParam: Joi.object({
    listingId: Joi.string().uuid().required().messages({
      'string.guid': 'Listing ID must be a valid UUID',
      'any.required': 'Listing ID is required',
    }),
  }),

  nftMintParam: Joi.object({
    nftMint: Joi.string()
      .min(32)
      .max(44)
      .custom(validateMintAddress)
      .required()
      .messages({
        'string.mintAddress': 'Invalid Solana NFT mint address format',
        'any.required': 'NFT mint address is required',
      }),
  }),
};

// Input sanitization functions
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/['"]/g, "") // Remove quotes
    .substring(0, 1000); // Limit length
};

// Sanitize body but preserve signature and message fields exactly as received
// These fields are cryptographic data that must not be modified
export const sanitizeBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body && typeof req.body === "object") {
    // Fields that must NOT be sanitized (cryptographic data)
    const preserveFields = ['message', 'signature', 'signedTransaction', 'transaction'];
    
    for (const key in req.body) {
      // Skip sanitization for cryptographic fields
      if (preserveFields.includes(key)) {
        continue;
      }
      
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  next();
};

export const sanitizeQuery = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.query && typeof req.query === "object") {
    for (const key in req.query) {
      if (typeof req.query[key] === "string") {
        req.query[key] = sanitizeInput(req.query[key] as string);
      }
    }
  }
  next();
};
