/**
 * Utility functions for generating request nonces and timestamps
 * Used to prevent replay attacks
 */

/**
 * Generate a unique nonce (UUID v4)
 */
export function generateNonce(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: Generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Generate request nonce and timestamp for replay attack prevention
 */
export function generateRequestNonce(): { nonce: string; timestamp: number } {
  return {
    nonce: generateNonce(),
    timestamp: getCurrentTimestamp(),
  };
}

