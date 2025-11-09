import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import crypto from 'crypto';
import { config } from '../config/env';
import { logger } from './logger';
import { AppError } from './errorHandler';
import { AuditService } from '../services/AuditService';
import { AuditEventType } from '../entities/AuditLog';

// CORS configuration - SECURITY: Never allow wildcards, always use explicit origins
export const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Build allowed origins list from environment variable or defaults
    let allowedOrigins: string[] = [];
    
    if (process.env.ALLOWED_ORIGINS) {
      // Parse from environment variable (comma-separated)
      allowedOrigins = process.env.ALLOWED_ORIGINS
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
    } else {
      // Default origins (development + production)
      allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:4000',
        'https://dust3.vercel.app',
        'https://dust3.com',
      ];
    }

    // SECURITY: Validate that no wildcards exist (even if someone modifies code)
    const hasWildcard = allowedOrigins.some(origin => 
      origin.includes('*') || 
      origin === '*' || 
      origin === 'null' || 
      origin === 'undefined'
    );
    
    if (hasWildcard) {
      logger.error('SECURITY: CORS wildcard detected in allowed origins! This is a security risk.');
      // In production, fail hard if wildcard detected
      if (config.env === 'production') {
        throw new Error('SECURITY ERROR: CORS wildcards are not allowed. Allowed origins must be explicit.');
      }
      // In development, log warning but allow
      logger.warn('CORS wildcard detected in development mode. This will be blocked in production.');
    }

    // SECURITY: In production, reject requests without origin header
    if (!origin) {
      if (config.env === 'development' || config.env === 'test') {
        // In development/test, allow requests with no origin (mobile apps, Postman, tests, etc.)
        logger.debug('CORS: Allowing request without origin in development/test mode');
        return callback(null, true);
      }
      // In production, reject requests without origin (security)
      logger.warn('CORS blocked: Request without origin header in production');
      return callback(new Error('Origin header required in production'));
    }

    // SECURITY: Validate origin format (must be valid URL)
    try {
      const originUrl = new URL(origin);
      // Only allow http and https protocols
      if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') {
        logger.warn('CORS blocked: Invalid origin protocol', { origin, protocol: originUrl.protocol });
        return callback(new Error('Invalid origin protocol'));
      }
    } catch (error) {
      logger.warn('CORS blocked: Invalid origin format', { origin });
      return callback(new Error('Invalid origin format'));
    }

    // SECURITY: Only allow explicit origins (no wildcards)
    if (allowedOrigins.includes(origin)) {
      logger.debug('CORS allowed origin:', origin);
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`, {
        allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : '[empty]',
        environment: config.env,
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Correlation-ID',
    'x-wallet-address',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-Correlation-ID'],
};

// Rate limiting configurations
// Uses in-memory storage (no Redis required)
export const generalLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs, // 15 minutes
  max: config.security.rateLimitMaxRequests, // 200 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

// Stricter rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per window
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
  skipSuccessfulRequests: true,
});

// Rate limiting for public endpoints (GET requests, no authentication required)
// SECURITY: Prevents API abuse and DoS attacks on public endpoints
// More generous limit than authenticated endpoints since they're read-only
export const publicEndpointsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please slow down',
      code: 'PUBLIC_ENDPOINT_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP address only for public endpoints (no wallet auth)
    const ip = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    return `public:${ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Public endpoint rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });
    
    const auditService = new AuditService();
    auditService.logSecurity(AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      httpMethod: req.method,
      description: 'Public endpoint rate limit exceeded (100 req/min)',
    }).catch(err => logger.error('Failed to log audit event:', err));
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please slow down',
        code: 'PUBLIC_ENDPOINT_RATE_LIMIT_EXCEEDED',
      },
    });
  },
  skipSuccessfulRequests: false, // Count all requests
});

// Stricter rate limiting for case opening
// Allows 20 pack openings per minute
export const caseOpeningLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 pack openings per minute
  message: {
    success: false,
    error: {
      message: 'Too many pack openings, please wait a moment before opening another pack',
      code: 'CASE_OPENING_RATE_LIMIT',
    },
  },
});

// Rate limiting for reveal operations (expensive - Solana RPC calls, metadata fetching)
// SECURITY: Only 10 reveals per minute to prevent DoS
export const revealLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 reveals per minute
  message: {
    success: false,
    error: {
      message: 'Too many reveal requests, please wait a moment',
      code: 'REVEAL_RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const walletAddress = (req as any).user?.walletAddress || 'unknown';
    return `reveal:${ip}:${walletAddress}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Reveal rate limit exceeded:', {
      ip: req.ip,
      walletAddress: (req as any).user?.walletAddress,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    
    const auditService = new AuditService();
    auditService.logSecurity(AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED, {
      walletAddress: (req as any).user?.walletAddress,
      userId: (req as any).user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      httpMethod: req.method,
      description: 'Reveal rate limit exceeded (10 req/min)',
    }).catch(err => logger.error('Failed to log audit event:', err));
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many reveal requests, please wait a moment',
        code: 'REVEAL_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

// Rate limiting for batch reveal operations (very expensive - processes multiple NFTs)
// SECURITY: Only 2 batch reveals per minute to prevent resource exhaustion
export const batchRevealLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // Only 2 batch reveals per minute
  message: {
    success: false,
    error: {
      message: 'Too many batch reveal requests, please wait a moment',
      code: 'BATCH_REVEAL_RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const walletAddress = (req as any).user?.walletAddress || 'unknown';
    return `batch-reveal:${ip}:${walletAddress}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Batch reveal rate limit exceeded:', {
      ip: req.ip,
      walletAddress: (req as any).user?.walletAddress,
      batchSize: (req.body?.nftMints as string[])?.length || 0,
      userAgent: req.get('User-Agent'),
    });
    
    const auditService = new AuditService();
    auditService.logSecurity(AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED, {
      walletAddress: (req as any).user?.walletAddress,
      userId: (req as any).user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      httpMethod: req.method,
      description: `Batch reveal rate limit exceeded (2 req/min). Batch size: ${(req.body?.nftMints as string[])?.length || 0}`,
    }).catch(err => logger.error('Failed to log audit event:', err));
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many batch reveal requests, please wait a moment',
        code: 'BATCH_REVEAL_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

// Rate limiting for buyback operations (expensive - Solana transaction validation and on-chain verification)
// SECURITY: Only 10 buybacks per minute to prevent DoS
export const buybackLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 buybacks per minute
  message: {
    success: false,
    error: {
      message: 'Too many buyback requests, please wait a moment',
      code: 'BUYBACK_RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const walletAddress = (req as any).user?.walletAddress || 'unknown';
    return `buyback:${ip}:${walletAddress}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Buyback rate limit exceeded:', {
      ip: req.ip,
      walletAddress: (req as any).user?.walletAddress,
      userAgent: req.get('User-Agent'),
    });
    
    const auditService = new AuditService();
    auditService.logSecurity(AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED, {
      walletAddress: (req as any).user?.walletAddress,
      userId: (req as any).user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      httpMethod: req.method,
      description: 'Buyback rate limit exceeded (10 req/min)',
    }).catch(err => logger.error('Failed to log audit event:', err));
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many buyback requests, please wait a moment',
        code: 'BUYBACK_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

// Rate limiting for Irys/Arweave uploads (expensive - metadata storage)
// SECURITY: Only 5 uploads per minute to prevent DoS
export const irysUploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Only 5 uploads per minute
  message: {
    success: false,
    error: {
      message: 'Too many metadata upload requests, please wait a moment',
      code: 'IRYS_UPLOAD_RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    // For Irys uploads, we don't have wallet auth, so use IP only
    return `irys-upload:${ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Irys upload rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      metadataSize: JSON.stringify(req.body?.metadata || {}).length,
    });
    
    const auditService = new AuditService();
    auditService.logSecurity(AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      httpMethod: req.method,
      description: 'Irys upload rate limit exceeded (5 req/min)',
    }).catch(err => logger.error('Failed to log audit event:', err));
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many metadata upload requests, please wait a moment',
        code: 'IRYS_UPLOAD_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

// Strict rate limiting for admin endpoints
// SECURITY: 30 requests per minute for admin operations (more lenient for admin UI)
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute (allows for UI navigation and multiple requests)
  message: {
    success: false,
    error: {
      message: 'Too many admin requests, please wait a moment',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Combine IP + wallet address for key generation
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const walletAddress = (req as any).user?.walletAddress || 'unknown';
    // Combine IP and wallet for better tracking
    return `admin:${ip}:${walletAddress}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Admin rate limit exceeded:', {
      ip: req.ip,
      walletAddress: (req as any).user?.walletAddress,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });
    
    // Audit log rate limit exceeded
    const auditService = new AuditService();
    auditService.logSecurity(AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED, {
      walletAddress: (req as any).user?.walletAddress,
      userId: (req as any).user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      httpMethod: req.method,
      description: 'Admin rate limit exceeded (30 req/min)',
    }).catch(err => logger.error('Failed to log audit event:', err));
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many admin requests, please wait a moment',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      },
    });
  },
  skipSuccessfulRequests: false, // Count all requests, even successful ones
});

// Helmet security configuration with enhanced CSP
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for React/Next.js
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // Allow inline styles for CSS-in-JS
      imgSrc: ["'self'", "data:", "https:", "http:"], // Allow images from any HTTPS/HTTP source
      fontSrc: ["'self'", "data:", "https:", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", "https:", "wss:", 'https://api.devnet.solana.com', 'wss://api.devnet.solana.com'], // Allow WebSocket connections
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.env === 'production' ? [] : null, // Only in production
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Request size limiting with stricter validation
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.get('content-length');
  const maxSize = 10 * 1024 * 1024; // 10MB
  const maxArraySize = 1000; // Maximum array items
  const maxStringLength = 10000; // Maximum string length

  // Check Content-Length header
  if (contentLength && parseInt(contentLength) > maxSize) {
    logger.warn('Request body too large', {
      ip: req.ip,
      contentLength,
      maxSize,
      path: req.path,
    });
    
    return res.status(413).json({
      success: false,
      error: {
        message: 'Request body too large (max 10MB)',
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  }

  // Validate array sizes in request body
  if (req.body && typeof req.body === 'object') {
    const validateObject = (obj: any, depth: number = 0): string | null => {
      // Prevent infinite recursion
      if (depth > 10) {
        return 'Object nesting too deep';
      }

      for (const key in obj) {
        const value = obj[key];

        // Check array size
        if (Array.isArray(value)) {
          if (value.length > maxArraySize) {
            return `Array '${key}' exceeds maximum size of ${maxArraySize} items`;
          }
          
          // Validate array items
          for (let i = 0; i < value.length; i++) {
            const error = validateObject(value[i], depth + 1);
            if (error) return error;
          }
        }
        // Check string length
        else if (typeof value === 'string' && value.length > maxStringLength) {
          return `String '${key}' exceeds maximum length of ${maxStringLength} characters`;
        }
        // Check nested objects
        else if (typeof value === 'object' && value !== null) {
          const error = validateObject(value, depth + 1);
          if (error) return error;
        }
      }

      return null;
    };

    const validationError = validateObject(req.body);
    if (validationError) {
      logger.warn('Request validation failed', {
        ip: req.ip,
        error: validationError,
        path: req.path,
      });

      return res.status(413).json({
        success: false,
        error: {
          message: validationError,
          code: 'PAYLOAD_VALIDATION_FAILED',
        },
      });
    }
  }

  return next();
};

// IP whitelisting for admin endpoints
export const adminIPWhitelist = (req: Request, res: Response, next: NextFunction) => {
  const allowedIPs = [
    '127.0.0.1',
    '::1',
    // Add production admin IPs here
  ];

  const clientIP = req.ip || (req as any).connection?.remoteAddress;

  if (config.env === 'production' && clientIP && !allowedIPs.includes(clientIP)) {
    logger.warn('Unauthorized admin access attempt:', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });

    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      },
    });
  }

  return next();
};

// Compression middleware configuration
export const compressionConfig = compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
});

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()'
  );
  
  // X-Permitted-Cross-Domain-Policies
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Expect-CT (Certificate Transparency)
  if (config.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }

  // Content-Security-Policy (already set by Helmet, but ensure it's correct)
  // Helmet config handles this, but we can add additional directives if needed

  next();
};

// API versioning middleware
export const apiVersioning = (req: Request, res: Response, next: NextFunction) => {
  const acceptVersion = req.headers['accept-version'] as string;
  const urlVersion = req.url.match(/^\/api\/v(\d+)\//)?.[1];
  
  // Default to v1 if no version specified
  req.apiVersion = urlVersion || acceptVersion || '1';
  
  next();
};

// Request timeout middleware
export const requestTimeout = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip timeout for Steam import endpoint (can take several minutes)
    if (req.path.includes('/inventory/steam/import')) {
      return next();
    }

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: {
            message: 'Request timeout',
            code: 'REQUEST_TIMEOUT',
          },
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  };
};

// CSRF Token Management
interface CSRFToken {
  token: string;
  expiresAt: number;
  ip: string;
}

class CSRFTokenManager {
  private tokens: Map<string, CSRFToken> = new Map();
  private readonly TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

  constructor() {
    // Periodic cleanup of expired tokens
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
  }

  generateToken(ip: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.TOKEN_TTL_MS;

    this.tokens.set(token, {
      token,
      expiresAt,
      ip,
    });

    logger.debug('CSRF token generated and stored', { 
      ip, 
      token: token.substring(0, 8) + '...',
      tokenLength: token.length,
      totalTokensAfter: this.tokens.size,
      expiresAt: new Date(expiresAt).toISOString(),
      // Verify it was actually saved
      savedToken: this.tokens.get(token) ? 'yes' : 'no',
    });
    return token;
  }

  validateToken(token: string, ip: string): boolean {
    const stored = this.tokens.get(token);

    if (!stored) {
      logger.warn('CSRF token not found in storage', { 
        ip, 
        token: token.substring(0, 8) + '...',
        tokenLength: token.length,
        totalTokens: this.tokens.size,
        tokenKeys: Array.from(this.tokens.keys()).slice(0, 5).map(t => t.substring(0, 8) + '...'),
        // Check if token exists with different IP
        storedIps: Array.from(this.tokens.values()).map(v => v.ip),
      });
      return false;
    }

    if (Date.now() > stored.expiresAt) {
      this.tokens.delete(token);
      logger.warn('CSRF token expired', { ip, token: token.substring(0, 8) + '...' });
      return false;
    }

    // Optional: Strict IP matching (can be disabled for load balancers)
    // Normalize both IPs to ensure consistent comparison
    const normalizeIpForComparison = (ipAddr: string) => {
      if (ipAddr === '::1' || ipAddr === '127.0.0.1' || ipAddr === 'localhost') {
        return '127.0.0.1';
      }
      return ipAddr;
    };
    
    const normalizedStoredIp = normalizeIpForComparison(stored.ip);
    const normalizedRequestIp = normalizeIpForComparison(ip);
    const ipMatch = normalizedStoredIp === normalizedRequestIp;
    
    if (!ipMatch && config.env === 'production') {
      logger.warn('CSRF token IP mismatch', {
        storedIp: stored.ip,
        normalizedStoredIp,
        requestIp: ip,
        normalizedRequestIp,
        token: token.substring(0, 8) + '...',
      });
      // In production, be strict about IP matching
      return false;
    } else if (!ipMatch) {
      // In development, log but allow
      logger.debug('CSRF token IP mismatch (development mode, allowing)', {
        storedIp: stored.ip,
        requestIp: ip,
        token: token.substring(0, 8) + '...',
      });
    }

    // Token is valid, refresh expiry
    stored.expiresAt = Date.now() + this.TOKEN_TTL_MS;
    return true;
  }

  revokeToken(token: string): void {
    this.tokens.delete(token);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired CSRF tokens`);
    }
  }

  getStats() {
    return {
      activeTokens: this.tokens.size,
    };
  }
}

// Singleton CSRF token manager
export const csrfTokenManager = new CSRFTokenManager();

// CSRF token generation endpoint middleware
export const generateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  // Get IP with fallback for localhost variations
  const xForwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(xForwardedFor) 
    ? xForwardedFor[0]?.trim() 
    : typeof xForwardedFor === 'string' 
      ? xForwardedFor.split(',')[0]?.trim() 
      : undefined;
  
  const ip = req.ip || 
             req.socket.remoteAddress || 
             forwardedIp || 
             'unknown';
  
  // Normalize localhost IPs to avoid mismatches
  const normalizedIp = (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') 
    ? '127.0.0.1' 
    : ip;
  
  const token = csrfTokenManager.generateToken(normalizedIp);
  const stats = csrfTokenManager.getStats();

  logger.debug('CSRF token endpoint response', {
    ip: normalizedIp,
    originalIp: ip,
    tokenLength: token.length,
    tokenPreview: token.substring(0, 8) + '...',
    totalTokensInManager: stats.activeTokens,
  });

  res.setHeader('X-CSRF-Token', token);
  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  });
};

// CSRF validation middleware for state-changing operations
export const validateCSRF = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for health check, CSRF token endpoint, and public endpoints
  const publicPaths = [
    '/health',
    '/csrf-token', // CSRF token endpoint itself doesn't need CSRF
    '/auth/connect', // Initial wallet connection doesn't need CSRF (wallet signature provides security)
    '/buyback/calculate',
    '/boxes/active',
    '/boxes/stats'
  ];
  if (publicPaths.some(path => req.path.includes(path))) {
    return next();
  }

  // Check both lowercase and camelCase versions of the header
  // Also check for any case variations (Express normalizes to lowercase)
  const getHeaderValue = (header: string | string[] | undefined): string | undefined => {
    if (!header) return undefined;
    return Array.isArray(header) ? header[0] : header;
  };
  
  const token = getHeaderValue(req.headers['x-csrf-token']) ||
                getHeaderValue(req.headers['x-csrftoken']) ||
                getHeaderValue(req.headers['csrf-token']) ||
                getHeaderValue(req.headers['X-CSRF-Token']);
  
  // Get IP with fallback for localhost variations, then normalize
  const xForwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(xForwardedFor) 
    ? xForwardedFor[0]?.trim() 
    : typeof xForwardedFor === 'string' 
      ? xForwardedFor.split(',')[0]?.trim() 
      : undefined;
  
  const rawIp = req.ip || req.socket.remoteAddress || forwardedIp || 'unknown';
  // Normalize localhost IPs to avoid mismatches
  const ip = (rawIp === '::1' || rawIp === '127.0.0.1' || rawIp === 'localhost') 
    ? '127.0.0.1' 
    : rawIp;

  // Debug: Log token detection
  const xCsrfTokenHeader = getHeaderValue(req.headers['x-csrf-token']);
  const XCsrfTokenHeader = getHeaderValue(req.headers['X-CSRF-Token']);
  
  logger.debug('CSRF validation attempt', {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token ? token.substring(0, 8) + '...' : undefined,
    ip,
    rawIp,
    headerKeys: Object.keys(req.headers).filter(h => h.toLowerCase().includes('csrf')),
    xCsrfToken: xCsrfTokenHeader ? xCsrfTokenHeader.substring(0, 8) + '...' : undefined,
    XCsrfToken: XCsrfTokenHeader ? XCsrfTokenHeader.substring(0, 8) + '...' : undefined,
  });

  if (!token) {
    // Check raw headers to see if token was sent but not parsed correctly
    const rawCsrfHeaders = req.rawHeaders
      .map((h, i) => {
        if (i % 2 === 0 && h.toLowerCase().includes('csrf')) {
          return { key: h, value: req.rawHeaders[i + 1]?.substring(0, 20) + '...' };
        }
        return null;
      })
      .filter(Boolean);
    
    logger.warn('CSRF token missing', {
      ip,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      availableHeaders: Object.keys(req.headers).filter(h => h.toLowerCase().includes('csrf')),
      allHeaderKeys: Object.keys(req.headers),
      rawCsrfHeaders,
      first10RawHeaders: req.rawHeaders.slice(0, 10),
    });

    // Audit log CSRF failure
    const auditService = new AuditService();
    auditService.logSecurity(AuditEventType.SECURITY_CSRF_FAILED, {
      walletAddress: (req as any).user?.walletAddress,
      userId: (req as any).user?.id,
      ipAddress: ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      httpMethod: req.method,
      description: 'CSRF token missing',
    }).catch(err => logger.error('Failed to log audit event:', err));

    return next(
      new AppError(
        'CSRF token required. Please obtain a token from /api/v1/csrf-token',
        403,
        'CSRF_TOKEN_MISSING'
      )
    );
  }

  if (!csrfTokenManager.validateToken(token, ip)) {
    logger.warn('CSRF token validation failed', {
      ip,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      token: token.substring(0, 8) + '...',
      tokenLength: token.length,
      allHeaders: Object.keys(req.headers),
      csrfHeaders: Object.keys(req.headers).filter(h => h.toLowerCase().includes('csrf')),
    });

    // Audit log CSRF failure
    const auditService = new AuditService();
    auditService.logSecurity(AuditEventType.SECURITY_CSRF_FAILED, {
      walletAddress: (req as any).user?.walletAddress,
      userId: (req as any).user?.id,
      ipAddress: ip,
      userAgent: req.get('User-Agent'),
      requestPath: req.path,
      httpMethod: req.method,
      description: 'Invalid or expired CSRF token',
    }).catch(err => logger.error('Failed to log audit event:', err));

    return next(
      new AppError('Invalid or expired CSRF token', 403, 'CSRF_TOKEN_INVALID')
    );
  }

  // Token is valid, continue
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiVersion: string;
    }
  }
} 