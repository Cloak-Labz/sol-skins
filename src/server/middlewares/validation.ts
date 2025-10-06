import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Joi from 'joi';
import { AppError } from './errorHandler';

// Express validator middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    return next(new AppError(errorMessages, 400, 'VALIDATION_ERROR'));
  }
  next();
};

// Joi validation middleware
export const validateSchema = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR'));
    }

    // Replace the original data with validated and sanitized data
    if (source === 'body') req.body = value;
    else if (source === 'query') req.query = value;
    else req.params = value;

    next();
  };
};

// Common validation schemas
export const schemas = {
  // Auth schemas
  connectWallet: Joi.object({
    walletAddress: Joi.string().length(44).required(),
    signature: Joi.string().optional(),
    message: Joi.string().optional(),
  }),

  updateProfile: Joi.object({
    username: Joi.string().min(3).max(50).optional(),
    email: Joi.string().email().optional(),
    tradeUrl: Joi.string().uri().optional(),
  }),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Marketplace schemas
  lootBoxesQuery: Joi.object({
    search: Joi.string().optional(),
    sortBy: Joi.string().valid('featured', 'price-low', 'price-high', 'name').default('featured'),
    filterBy: Joi.string().valid('all', 'standard', 'premium', 'special', 'limited', 'legendary').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Case opening schemas
  openCase: Joi.object({
    lootBoxTypeId: Joi.string().uuid().required(),
    paymentMethod: Joi.string().valid('SOL', 'USDC').default('SOL'),
  }),

  caseDecision: Joi.object({
    decision: Joi.string().valid('keep', 'buyback').required(),
  }),

  // Inventory schemas
  inventoryQuery: Joi.object({
    search: Joi.string().optional(),
    sortBy: Joi.string().valid('date', 'price-high', 'price-low', 'name', 'rarity').default('date'),
    filterBy: Joi.string().valid('all', 'common', 'uncommon', 'rare', 'epic', 'legendary').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  buyback: Joi.object({
    minAcceptablePrice: Joi.number().positive().optional(),
  }),

  // Transaction history schemas
  transactionsQuery: Joi.object({
    search: Joi.string().optional(),
    type: Joi.string().valid('all', 'open_case', 'buyback', 'payout').default('all'),
    sortBy: Joi.string().valid('date', 'amount-high', 'amount-low').default('date'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Leaderboard schemas
  leaderboardQuery: Joi.object({
    period: Joi.string().valid('all-time', 'monthly', 'weekly').default('all-time'),
    metric: Joi.string().valid('inventory-value', 'cases-opened', 'profit').default('inventory-value'),
    limit: Joi.number().integer().min(1).max(1000).default(100),
  }),

  // Activity schemas
  activityQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
};

// Input sanitization functions
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 1000); // Limit length
};

export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  next();
};

export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key] as string);
      }
    }
  }
  next();
};
