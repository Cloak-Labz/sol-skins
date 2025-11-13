/**
 * Input sanitization utilities to prevent XSS attacks
 */

/**
 * HTML escape characters to prevent XSS
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Remove all HTML tags from string
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize text input (escape HTML, remove tags, trim)
 */
export function sanitizeText(input: string | null | undefined, maxLength?: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags first
  let sanitized = stripHtmlTags(input);
  
  // Escape HTML entities
  sanitized = escapeHtml(sanitized);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize username (alphanumeric, underscore, hyphen, max 50 chars)
 */
export function sanitizeUsername(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and escape
  let sanitized = sanitizeText(input, 50);
  
  // Only allow alphanumeric, underscore, hyphen, and spaces
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\- ]/g, '');
  
  // Remove leading/trailing spaces and collapse multiple spaces
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  return sanitized;
}

/**
 * Sanitize email (basic validation, escape HTML)
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and escape
  let sanitized = sanitizeText(input, 255);
  
  // Convert to lowercase
  sanitized = sanitized.toLowerCase();
  
  // Basic email validation (doesn't guarantee valid email, but prevents obvious XSS)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return ''; // Invalid email format
  }
  
  return sanitized;
}

/**
 * Sanitize URL (validate format, prevent javascript: and data: URIs)
 */
export function sanitizeUrl(input: string | null | undefined, maxLength: number = 2048): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and escape
  let sanitized = sanitizeText(input, maxLength);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Must start with http:// or https://
  if (!sanitized.match(/^https?:\/\//i)) {
    return ''; // Invalid URL format
  }
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  const lowerUrl = sanitized.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return ''; // Dangerous protocol blocked
    }
  }
  
  // Validate URL format
  try {
    const url = new URL(sanitized);
    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    return sanitized;
  } catch {
    return ''; // Invalid URL
  }
}

/**
 * Sanitize Steam Trade URL (specific format validation)
 */
export function sanitizeSteamTradeUrl(input: string | null | undefined): string | null {
  // Allow null/undefined to clear the field
  if (input === null || input === undefined) {
    return null;
  }
  
  if (typeof input !== 'string') {
    return null;
  }

  // Remove HTML tags and escape
  let sanitized = sanitizeText(input, 500);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Allow empty string to clear the field
  if (sanitized === '') {
    return null;
  }
  
  // Must be a valid Steam trade URL
  // More flexible regex to accept various Steam trade URL formats
  // Examples:
  // - https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefgh
  // - https://steamcommunity.com/tradeoffer/new/?partner=123456789
  // - http://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123
  const steamTradeUrlRegex = /^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+(&token=[a-zA-Z0-9_-]+)?(&.*)?$/i;
  
  if (!steamTradeUrlRegex.test(sanitized)) {
    // Log for debugging - this helps identify if URLs are being rejected incorrectly
    const { logger } = require('../middlewares/logger');
    logger.warn('Invalid Steam Trade URL format:', sanitized);
    return null; // Invalid Steam trade URL format
  }
  
  return sanitized;
}

/**
 * Sanitize skin name (escape HTML, remove dangerous chars, max 200 chars)
 */
export function sanitizeSkinName(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and escape
  let sanitized = sanitizeText(input, 200);
  
  // Remove control characters (but allow newlines and tabs for formatting)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Sanitize object recursively (for nested objects)
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldSanitizers?: Record<string, (value: any) => string>
): T {
  const sanitized = { ...obj } as any;
  
  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];
      
      // Apply custom sanitizer if provided
      if (fieldSanitizers && fieldSanitizers[key]) {
        sanitized[key] = fieldSanitizers[key](value);
        continue;
      }
      
      // Default sanitization based on field name
      if (typeof value === 'string') {
        if (key.toLowerCase().includes('username')) {
          sanitized[key] = sanitizeUsername(value);
        } else if (key.toLowerCase().includes('email')) {
          sanitized[key] = sanitizeEmail(value);
        } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('uri')) {
          if (key.toLowerCase().includes('trade')) {
            sanitized[key] = sanitizeSteamTradeUrl(value);
          } else {
            sanitized[key] = sanitizeUrl(value);
          }
        } else if (key.toLowerCase().includes('name') || key.toLowerCase().includes('description')) {
          sanitized[key] = sanitizeSkinName(value);
        } else {
          // Default: escape HTML
          sanitized[key] = sanitizeText(value);
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeObject(value, fieldSanitizers);
      } else if (Array.isArray(value)) {
        // Sanitize array elements
        sanitized[key] = value.map((item) => {
          if (typeof item === 'string') {
            return sanitizeText(item);
          } else if (typeof item === 'object' && item !== null) {
            return sanitizeObject(item, fieldSanitizers);
          }
          return item;
        });
      }
    }
  }
  
  return sanitized;
}

/**
 * Sanitize profile update object
 */
export function sanitizeProfileUpdate(updates: {
  username?: string;
  email?: string;
  tradeUrl?: string | null;
}): {
  username?: string;
  email?: string;
  tradeUrl?: string | null;
} {
  const sanitized: any = {};
  
  if (updates.username !== undefined) {
    const sanitizedUsername = sanitizeUsername(updates.username);
    if (sanitizedUsername) {
      sanitized.username = sanitizedUsername;
    }
  }
  
  if (updates.email !== undefined) {
    const sanitizedEmail = sanitizeEmail(updates.email);
    if (sanitizedEmail) {
      sanitized.email = sanitizedEmail;
    }
  }
  
  // IMPORTANT: Always include tradeUrl if it's in the updates, even if null/empty
  // This allows clearing the field and ensures updates are applied
  if (updates.tradeUrl !== undefined) {
    const sanitizedTradeUrl = sanitizeSteamTradeUrl(updates.tradeUrl);
    // Include the field even if null (to allow clearing) or if it's a valid URL
    sanitized.tradeUrl = sanitizedTradeUrl;
  }
  
  return sanitized;
}

