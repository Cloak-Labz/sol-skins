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
    signature: Joi.string().required(),
    message: Joi.string().required(),
  }),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Marketplace schemas
  lootBoxesQuery: Joi.object({
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().valid('featured', 'price-low', 'price-high', 'name').default('featured'),
    filterBy: Joi.string().valid('all', 'standard', 'premium', 'special', 'limited', 'legendary').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Case opening schemas
  openCase: Joi.object({
    lootBoxTypeId: Joi.string().uuid().required(),
    paymentMethod: Joi.string().valid('SOL', 'USDC').required(),
  }),

  caseDecision: Joi.object({
    decision: Joi.string().valid('keep', 'buyback').required(),
  }),

  // Inventory schemas
  inventoryQuery: Joi.object({
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().valid('date', 'price-high', 'price-low', 'name', 'rarity').default('date'),
    filterBy: Joi.string().valid('all', 'common', 'uncommon', 'rare', 'epic', 'legendary').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  buyback: Joi.object({
    minAcceptablePrice: Joi.number().positive().required(),
  }),

  // History schemas
  transactionsQuery: Joi.object({
    search: Joi.string().max(100).optional(),
    type: Joi.string().valid('all', 'open_case', 'buyback', 'payout').default('all'),
    sortBy: Joi.string().valid('date', 'amount-high', 'amount-low').default('date'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Leaderboard schemas
  leaderboardQuery: Joi.object({
    period: Joi.string().valid('all-time', 'monthly', 'weekly').default('all-time'),
    metric: Joi.string().valid('inventory-value', 'cases-opened', 'profit').default('inventory-value'),
    limit: Joi.number().integer().min(1).max(100).default(100),
  }),

  // UUID param validation
  uuidParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  skinIdParam: Joi.object({
    skinId: Joi.string().uuid().required(),
  }),
};

// Sanitization functions
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
};

// Sanitization middleware
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

// Express validator rules for common validations
export const validationRules = {
  walletAddress: body('walletAddress')
    .isLength({ min: 44, max: 44 })
    .withMessage('Wallet address must be exactly 44 characters')
    .matches(/^[1-9A-HJ-NP-Za-km-z]+$/)
    .withMessage('Invalid wallet address format'),

  uuid: (field: string) => param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
}; 