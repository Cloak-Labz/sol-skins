/**
 * Utility functions for handling sensitive data (private keys, secrets, etc.)
 * Prevents accidental exposure in logs, errors, or responses
 */

// Patterns that indicate sensitive data
const SENSITIVE_PATTERNS = [
  /private.?key/gi,
  /secret/gi,
  /password/gi,
  /admin.?wallet/gi,
  /oracle.?key/gi,
  /irys.?key/gi,
  /jwt.?secret/gi,
];

// Known sensitive environment variable names
const SENSITIVE_ENV_VARS = [
  'ADMIN_WALLET_PRIVATE_KEY',
  'ORACLE_PRIVATE_KEY',
  'IRYS_PRIVATE_KEY',
  'JWT_SECRET',
  'DB_PASSWORD',
  'STEAM_API_KEY',
  'DISCORD_BOT_TOKEN',
];

/**
 * Mask sensitive data in strings
 * Replaces values with [REDACTED] to prevent accidental exposure
 */
export function maskSensitiveData(input: string): string {
  let masked = input;

  // Mask common patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      // Replace with masked version
      return match.replace(/./g, '*');
    });
  }

  // Mask JSON arrays that look like private keys (Solana format)
  masked = masked.replace(/\[[\d\s,]+\]/g, (match) => {
    // If it's a JSON array with numbers (likely a private key array)
    try {
      const parsed = JSON.parse(match);
      if (Array.isArray(parsed) && parsed.length > 20 && parsed.every(n => typeof n === 'number')) {
        return '[REDACTED_PRIVATE_KEY]';
      }
    } catch {
      // Not JSON, keep original
    }
    return match;
  });

  // Mask base58 strings (Solana private keys)
  masked = masked.replace(/[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{40,}/g, (match) => {
    // If it's a long base58 string (likely a private key), mask it
    if (match.length >= 40 && match.length <= 200) {
      return match.substring(0, 4) + '...' + match.substring(match.length - 4);
    }
    return match;
  });

  return masked;
}

/**
 * Sanitize an object by masking sensitive values
 */
export function sanitizeObject(obj: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return maskSensitiveData(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      
      // Check if key indicates sensitive data
      const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key)) ||
                            SENSITIVE_ENV_VARS.some(envVar => lowerKey.includes(envVar.toLowerCase()));

      if (isSensitiveKey) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(obj[key], depth + 1);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Check if a string contains sensitive data patterns
 */
export function containsSensitiveData(input: string): boolean {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Validate that private keys are not exposed in logs
 * Should be called before logging sensitive operations
 */
export function validateNoPrivateKeyExposure(data: any): void {
  const stringified = JSON.stringify(data);
  
  if (containsSensitiveData(stringified)) {
    throw new Error('Attempted to log sensitive data - this should not happen');
  }
}

/**
 * Safe logger wrapper that automatically masks sensitive data
 */
export function safeLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any): void {
  const sanitizedMeta = meta ? sanitizeObject(meta) : undefined;
  const sanitizedMessage = maskSensitiveData(message);

  // Use console methods directly to avoid circular dependency
  const logMethod = console[level];
  if (logMethod) {
    if (sanitizedMeta) {
      logMethod(sanitizedMessage, sanitizedMeta);
    } else {
      logMethod(sanitizedMessage);
    }
  }
}

