import { PublicKey } from '@solana/web3.js';
import { logger } from '../middlewares/logger';

/**
 * Solana Address Validation Utilities
 * Validates Solana wallet addresses and NFT mint addresses using PublicKey
 */

/**
 * Validates if a string is a valid Solana address (base58, 32-44 chars, valid PublicKey)
 * @param address The address to validate
 * @returns True if valid, false otherwise
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Basic length check (Solana addresses are typically 32-44 characters in base58)
  if (address.length < 32 || address.length > 44) {
    return false;
  }

  // Base58 character set check (Solana uses base58 encoding)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(address)) {
    return false;
  }

  // Try to create PublicKey to validate format
  try {
    const publicKey = new PublicKey(address);
    // Verify it's a valid public key (32 bytes when decoded)
    return publicKey.toBytes().length === 32;
  } catch (error) {
    // PublicKey constructor throws if address is invalid
    return false;
  }
}

/**
 * Validates and normalizes a Solana address
 * @param address The address to validate
 * @returns Normalized address if valid, throws error if invalid
 */
export function validateAndNormalizeSolanaAddress(address: string): string {
  if (!isValidSolanaAddress(address)) {
    throw new Error(`Invalid Solana address: ${address}`);
  }

  try {
    // Normalize by creating PublicKey and converting back to string
    // This ensures consistent formatting
    const publicKey = new PublicKey(address);
    return publicKey.toString();
  } catch (error) {
    throw new Error(`Failed to normalize Solana address: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates multiple Solana addresses
 * @param addresses Array of addresses to validate
 * @returns Object with valid addresses and invalid addresses
 */
export function validateSolanaAddresses(addresses: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const address of addresses) {
    if (isValidSolanaAddress(address)) {
      try {
        const normalized = validateAndNormalizeSolanaAddress(address);
        valid.push(normalized);
      } catch (error) {
        logger.warn('Failed to normalize address:', address, error);
        invalid.push(address);
      }
    } else {
      invalid.push(address);
    }
  }

  return { valid, invalid };
}

/**
 * Validates if an address is a valid Solana wallet address (for wallet addresses specifically)
 * Currently same as isValidSolanaAddress, but can be extended for wallet-specific validation
 */
export function isValidWalletAddress(address: string): boolean {
  return isValidSolanaAddress(address);
}

/**
 * Validates if an address is a valid NFT mint address
 * Currently same as isValidSolanaAddress, but can be extended for mint-specific validation
 */
export function isValidMintAddress(address: string): boolean {
  return isValidSolanaAddress(address);
}

/**
 * Joi custom validator for Solana addresses
 * Use in Joi schemas: Joi.string().custom(validateSolanaAddress)
 */
export function validateSolanaAddress(value: string, helpers: any): string {
  if (!value || typeof value !== 'string') {
    return helpers.error('string.base');
  }

  if (!isValidSolanaAddress(value)) {
    return helpers.error('string.solanaAddress');
  }

  try {
    return validateAndNormalizeSolanaAddress(value);
  } catch (error) {
    return helpers.error('string.solanaAddress');
  }
}

/**
 * Joi custom validator for wallet addresses specifically
 */
export function validateWalletAddress(value: string, helpers: any): string {
  if (!isValidWalletAddress(value)) {
    return helpers.error('string.walletAddress');
  }

  try {
    return validateAndNormalizeSolanaAddress(value);
  } catch (error) {
    return helpers.error('string.walletAddress');
  }
}

/**
 * Joi custom validator for NFT mint addresses specifically
 */
export function validateMintAddress(value: string, helpers: any): string {
  if (!isValidMintAddress(value)) {
    return helpers.error('string.mintAddress');
  }

  try {
    return validateAndNormalizeSolanaAddress(value);
  } catch (error) {
    return helpers.error('string.mintAddress');
  }
}

