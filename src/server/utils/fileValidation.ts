import { Request } from 'express';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../middlewares/logger';

/**
 * Allowed MIME types for file uploads
 */
export const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  
  // Documents (if needed in future)
  'application/pdf': ['.pdf'],
  'application/json': ['.json'],
  
  // Archives (if needed in future)
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
} as const;

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Maximum metadata JSON size (1MB)
 */
export const MAX_METADATA_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * Dangerous file extensions (should be blocked)
 */
export const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.sh', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.cgi',
  '.dll', '.so', '.dylib', '.deb', '.rpm', '.msi', '.app', '.apk',
];

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): boolean {
  if (!filename) return false;
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  // Block dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return false;
  }
  
  // Check if extension is in allowed list
  const allowedExtensions = Object.values(ALLOWED_MIME_TYPES).flat();
  return allowedExtensions.includes(extension);
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string): boolean {
  if (!mimeType) return false;
  return mimeType in ALLOWED_MIME_TYPES;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Validate file name (prevent path traversal and malicious names)
 */
export function validateFileName(filename: string): boolean {
  if (!filename) return false;
  
  // Block path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  // Block null bytes
  if (filename.includes('\0')) {
    return false;
  }
  
  // Maximum filename length
  if (filename.length > 255) {
    return false;
  }
  
  // Only allow alphanumeric, dots, hyphens, underscores
  const safePattern = /^[a-zA-Z0-9._-]+$/;
  return safePattern.test(filename);
}

/**
 * Validate metadata JSON structure and size
 */
export function validateMetadata(metadata: any): { valid: boolean; error?: string } {
  if (!metadata) {
    return { valid: false, error: 'Metadata is required' };
  }
  
  // Check if it's an object
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { valid: false, error: 'Metadata must be an object' };
  }
  
  // Check size (stringified)
  const metadataString = JSON.stringify(metadata);
  if (metadataString.length > MAX_METADATA_SIZE) {
    return { valid: false, error: `Metadata size exceeds maximum allowed (${MAX_METADATA_SIZE / 1024 / 1024}MB)` };
  }
  
  // Check for dangerous properties (prevent prototype pollution)
  if ('__proto__' in metadata || 'constructor' in metadata) {
    return { valid: false, error: 'Metadata contains forbidden properties' };
  }
  
  // Check nesting depth (prevent DoS via deep nesting)
  const depth = getObjectDepth(metadata);
  if (depth > 10) {
    return { valid: false, error: 'Metadata nesting depth exceeds maximum (10 levels)' };
  }
  
  return { valid: true };
}

/**
 * Get object nesting depth
 */
function getObjectDepth(obj: any, currentDepth: number = 0, maxDepth: number = 20): number {
  if (currentDepth >= maxDepth) return currentDepth;
  
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return currentDepth;
  }
  
  let maxChildDepth = currentDepth;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const childDepth = getObjectDepth(obj[key], currentDepth + 1, maxDepth);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }
  }
  
  return maxChildDepth;
}

/**
 * Validate file upload (for multipart/form-data)
 * This is a middleware-ready function for future use
 */
export function validateFileUpload(req: Request): { valid: boolean; error?: string } {
  // Check if file is present
  if (!req.file && !req.files) {
    return { valid: false, error: 'No file uploaded' };
  }
  
  const file = req.file || (req.files && (req.files as any)[0]);
  
  if (!file) {
    return { valid: false, error: 'No file uploaded' };
  }
  
  // Validate file name
  if (!validateFileName(file.originalname || file.name)) {
    return { valid: false, error: 'Invalid file name' };
  }
  
  // Validate file extension
  if (!validateFileExtension(file.originalname || file.name)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  // Validate MIME type
  if (file.mimetype && !validateMimeType(file.mimetype)) {
    return { valid: false, error: 'MIME type not allowed' };
  }
  
  // Validate file size
  if (!validateFileSize(file.size)) {
    return { valid: false, error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }
  
  return { valid: true };
}

/**
 * Sanitize metadata object (remove dangerous properties)
 */
export function sanitizeMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }
  
  const sanitized: any = {};
  
  for (const key in metadata) {
    if (metadata.hasOwnProperty(key)) {
      // Skip dangerous properties
      if (key === '__proto__' || key === 'constructor') {
        continue;
      }
      
      // Recursively sanitize nested objects
      if (typeof metadata[key] === 'object' && metadata[key] !== null) {
        sanitized[key] = sanitizeMetadata(metadata[key]);
      } else {
        sanitized[key] = metadata[key];
      }
    }
  }
  
  return sanitized;
}

