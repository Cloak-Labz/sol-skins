/**
 * Protection against timing attacks
 * Implements constant-time comparisons and random delays
 */

/**
 * Constant-time string comparison
 * Always takes the same amount of time regardless of where the difference occurs
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // If lengths differ, still compare all bytes to avoid leaking length
  const maxLength = Math.max(a.length, b.length);
  let result = 0;

  // Always compare all bytes, even if lengths differ
  for (let i = 0; i < maxLength; i++) {
    const aChar = i < a.length ? a.charCodeAt(i) : 0;
    const bChar = i < b.length ? b.charCodeAt(i) : 0;
    result |= aChar ^ bChar; // XOR: 0 if equal, non-zero if different
  }

  return result === 0 && a.length === b.length;
}

/**
 * Constant-time comparison for arrays/buffers
 */
export function constantTimeCompareBuffers(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    // Still compare all bytes to avoid leaking length difference
    const maxLength = Math.max(a.length, b.length);
    let result = 0;
    for (let i = 0; i < maxLength; i++) {
      const aByte = i < a.length ? a[i] : 0;
      const bByte = i < b.length ? b[i] : 0;
      result |= aByte ^ bByte;
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Constant-time array membership check
 * Always checks all elements, even if match is found early
 */
export function constantTimeIncludes<T>(array: T[], item: T, compare?: (a: T, b: T) => boolean): boolean {
  let found = false;
  const compareFn = compare || ((a, b) => a === b);

  // Always check all elements to prevent timing leaks
  for (let i = 0; i < array.length; i++) {
    if (compareFn(array[i], item)) {
      found = true;
      // Don't break - continue checking all elements
    }
  }

  return found;
}

/**
 * Constant-time string array membership check
 */
export function constantTimeStringIncludes(array: string[], item: string): boolean {
  let found = false;

  // Always check all elements
  for (let i = 0; i < array.length; i++) {
    if (constantTimeCompare(array[i], item)) {
      found = true;
      // Don't break - continue checking
    }
  }

  return found;
}

/**
 * Add random delay to mask timing differences
 * @param minMs Minimum delay in milliseconds
 * @param maxMs Maximum delay in milliseconds
 */
export async function randomDelay(minMs: number = 10, maxMs: number = 50): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Execute operation with constant-time behavior
 * Always takes similar time regardless of success/failure
 */
export async function executeWithConstantTime<T>(
  operation: () => Promise<T> | T,
  options: {
    minDelay?: number;
    maxDelay?: number;
    alwaysExecute?: () => Promise<void> | void; // Always executed, even on error
  } = {}
): Promise<T> {
  const { minDelay = 10, maxDelay = 50, alwaysExecute } = options;

  try {
    const result = await operation();
    
    // Always execute cleanup/dummy operations
    if (alwaysExecute) {
      await alwaysExecute();
    }
    
    // Add random delay
    await randomDelay(minDelay, maxDelay);
    
    return result;
  } catch (error) {
    // Even on error, execute cleanup and delay
    if (alwaysExecute) {
      await alwaysExecute();
    }
    
    await randomDelay(minDelay, maxDelay);
    
    throw error;
  }
}

/**
 * Constant-time wallet address comparison
 * Compares wallet addresses in constant time
 */
export function constantTimeWalletCompare(a: string, b: string): boolean {
  // Normalize wallet addresses (remove whitespace, case-insensitive if needed)
  const normalizedA = a.trim().toLowerCase();
  const normalizedB = b.trim().toLowerCase();
  
  return constantTimeCompare(normalizedA, normalizedB);
}

/**
 * Check if wallet address is in admin list (constant-time)
 */
export function constantTimeAdminCheck(walletAddress: string, adminWallets: string[]): boolean {
  // Normalize input
  const normalizedWallet = walletAddress.trim().toLowerCase();
  const normalizedAdmins = adminWallets.map(w => w.trim().toLowerCase());
  
  return constantTimeStringIncludes(normalizedAdmins, normalizedWallet);
}

