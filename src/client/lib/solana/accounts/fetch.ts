import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getGlobalPDA, getBatchPDA, getBoxStatePDA } from "../utils/pda";

export interface BoxStateAccount {
  owner: PublicKey;
  batchId: number;
  opened: boolean;
  assignedInventory: Uint8Array;
  asset: PublicKey;
  mintTime: number;
  openTime: number;
  randomIndex: number;
  redeemed: boolean;
  redeemTime: number;
  bump: number;
}

export interface BatchAccount {
  batchId: number;
  candyMachine: PublicKey;
  merkleRoot: Uint8Array;
  snapshotTime: number;
  totalItems: number;
  boxesMinted: number;
  boxesOpened: number;
  bump: number;
  metadataUris: string[];
}

export interface GlobalAccount {
  authority: PublicKey;
  oraclePubkey: PublicKey; // Added: oracle public key for price verification
  usdcMint: PublicKey;
  buybackEnabled: boolean;
  minTreasuryBalance: number;
  currentBatch: number;
  totalBoxesMinted: number;
  totalBuybacks: number;
  totalBuybackVolume: number;
  paused: boolean;
  pendingAuthority: PublicKey | null;
  bump: number;
}

/**
 * Fetch Global state
 */
export async function fetchGlobalState(
  program: Program
): Promise<GlobalAccount | null> {
  try {
    const [globalPDA] = getGlobalPDA();
    const account = await program.account.global.fetch(globalPDA);
    return account as any;
  } catch (error) {
    console.error("Error fetching global state:", error);
    return null;
  }
}

/**
 * Fetch Batch by ID
 */
export async function fetchBatch(
  program: Program,
  batchId: number
): Promise<BatchAccount | null> {
  try {
    const [batchPDA] = getBatchPDA(batchId);
    const account = await program.account.batch.fetch(batchPDA);
    return account as any;
  } catch (error) {
    console.error(`Error fetching batch ${batchId}:`, error);
    return null;
  }
}

/**
 * Fetch BoxState by asset pubkey
 */
export async function fetchBoxState(
  program: Program,
  assetPubkey: PublicKey
): Promise<BoxStateAccount | null> {
  try {
    const [boxStatePDA] = getBoxStatePDA(assetPubkey);
    const account = await program.account.boxState.fetch(boxStatePDA);
    return account as any;
  } catch (error) {
    console.error("Error fetching box state:", error);
    return null;
  }
}

/**
 * Fetch all boxes owned by a wallet
 */
export async function fetchUserBoxes(
  program: Program,
  owner: PublicKey
): Promise<BoxStateAccount[]> {
  try {
    const accounts = await program.account.boxState.all([
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: owner.toBase58(),
        },
      },
    ]);

    return accounts.map((acc) => acc.account as any);
  } catch (error) {
    console.error("Error fetching user boxes:", error);
    return [];
  }
}

/**
 * Fetch boxes by batch ID
 */
export async function fetchBoxesByBatch(
  program: Program,
  batchId: number
): Promise<BoxStateAccount[]> {
  try {
    // Note: This requires the batch_id field to be at a specific offset
    // You may need to adjust the offset based on the actual account structure
    const batchIdBuffer = Buffer.alloc(8);
    batchIdBuffer.writeBigUInt64LE(BigInt(batchId));

    const accounts = await program.account.boxState.all([
      {
        memcmp: {
          offset: 40, // Adjust offset as needed (8 discriminator + 32 pubkey)
          bytes: batchIdBuffer.toString("base64"),
        },
      },
    ]);

    return accounts.map((acc) => acc.account as any);
  } catch (error) {
    console.error(`Error fetching boxes for batch ${batchId}:`, error);
    return [];
  }
}
