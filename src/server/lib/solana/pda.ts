import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './client';

/**
 * Derive Global PDA
 */
export function getGlobalPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID);
}

/**
 * Derive Batch PDA
 */
export function getBatchPDA(batchId: number): [PublicKey, number] {
  const batchIdBuffer = Buffer.alloc(8);
  batchIdBuffer.writeBigUInt64LE(BigInt(batchId));

  return PublicKey.findProgramAddressSync([Buffer.from('batch'), batchIdBuffer], PROGRAM_ID);
}

/**
 * Derive BoxState PDA
 */
export function getBoxStatePDA(assetPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('box'), assetPubkey.toBuffer()], PROGRAM_ID);
}

/**
 * Derive VrfPending PDA
 */
export function getVrfPendingPDA(assetPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('vrf_pending'), assetPubkey.toBuffer()], PROGRAM_ID);
}

/**
 * Derive PriceStore PDA
 */
export function getPriceStorePDA(inventoryIdHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('price'), Buffer.from(inventoryIdHash)], PROGRAM_ID);
}
