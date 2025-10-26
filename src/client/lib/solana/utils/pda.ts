import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '../config/anchor-client';

/**
 * Derive Global PDA
 */
export function getGlobalPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global')],
    PROGRAM_ID
  );
}

/**
 * Derive Batch PDA
 */
export function getBatchPDA(batchId: number): [PublicKey, number] {
  const batchIdBuffer = Buffer.alloc(8);
  batchIdBuffer.writeBigUInt64LE(BigInt(batchId));

  return PublicKey.findProgramAddressSync(
    [Buffer.from('batch'), batchIdBuffer],
    PROGRAM_ID
  );
}

/**
 * Derive BoxState PDA
 */
export function getBoxStatePDA(assetPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('box'), assetPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive VrfPending PDA
 */
export function getVrfPendingPDA(assetPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vrf_pending'), assetPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive PriceStore PDA
 */
export function getPriceStorePDA(inventoryIdHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('price'), Buffer.from(inventoryIdHash)],
    PROGRAM_ID
  );
}

/**
 * Derive InventoryAssignment PDA
 */
export function getInventoryAssignmentPDA(inventoryIdHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('inventory'), Buffer.from(inventoryIdHash)],
    PROGRAM_ID
  );
}

/**
 * Derive Treasury ATA PDA (using SPL Token program)
 */
export function getTreasuryATA(usdcMint: PublicKey): [PublicKey, number] {
  const [globalPDA] = getGlobalPDA();
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

  return PublicKey.findProgramAddressSync(
    [
      globalPDA.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      usdcMint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
}
