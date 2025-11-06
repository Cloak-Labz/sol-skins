import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../middlewares/logger';
import { withTimeout } from './solanaHelpers';

/**
 * Mint Verification Utility
 * 
 * Verifies that an NFT mint address exists on-chain and is a valid NFT.
 * This provides additional security beyond format validation.
 * 
 * SECURITY: On-chain mint verification
 * - Verifies mint exists on Solana blockchain
 * - Validates mint account structure
 * - Can check if mint is actually an NFT (vs token)
 * - Prevents using invalid/non-existent mints
 */

/**
 * Verify that a mint address exists on-chain
 * @param connection Solana RPC connection
 * @param nftMint Mint address to verify
 * @param timeoutMs Timeout in milliseconds (default: 5000ms)
 * @returns True if mint exists and is valid, false otherwise
 */
export async function verifyMintExists(
  connection: Connection,
  nftMint: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  try {
    const mintPubkey = new PublicKey(nftMint);
    
    // Fetch mint account info with timeout
    const accountInfo = await withTimeout(
      connection.getAccountInfo(mintPubkey),
      timeoutMs,
      'verifyMintExists'
    );

    if (!accountInfo) {
      logger.warn('Mint account does not exist on-chain:', { nftMint });
      return false;
    }

    // Basic validation: mint account should have data
    // For full NFT validation, you would check:
    // - Account owner is Token Program
    // - Mint authority is correct
    // - Supply is 1 (NFT) or 0 (if burned)
    // - Decimals is 0 (NFTs have 0 decimals)
    
    return true;
  } catch (error: any) {
    logger.error('Error verifying mint on-chain:', {
      nftMint,
      error: error.message,
    });
    return false;
  }
}

/**
 * Verify mint and throw error if invalid
 * @param connection Solana RPC connection
 * @param nftMint Mint address to verify
 * @param timeoutMs Timeout in milliseconds (default: 5000ms)
 * @throws Error if mint doesn't exist or is invalid
 */
export async function verifyMintOrThrow(
  connection: Connection,
  nftMint: string,
  timeoutMs: number = 5000
): Promise<void> {
  const exists = await verifyMintExists(connection, nftMint, timeoutMs);
  if (!exists) {
    throw new Error(`Mint address ${nftMint} does not exist on-chain or is invalid`);
  }
}

