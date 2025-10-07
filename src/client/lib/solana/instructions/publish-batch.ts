import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getGlobalPDA, getBatchPDA } from "../utils/pda";

export interface PublishBatchParams {
  program: Program;
  authority: PublicKey;
  batchId: number;
  candyMachine: PublicKey;
  metadataUris: string[];
  merkleRoot: Uint8Array; // Must be provided and non-zero
  snapshotTime?: number; // Optional: timestamp, defaults to now
}

export interface PublishBatchResult {
  signature: string;
  batchPDA: PublicKey;
  batchId: number;
}

/**
 * Publish a new batch (loot pool)
 */
export async function publishBatch(
  params: PublishBatchParams
): Promise<PublishBatchResult> {
  const {
    program,
    authority,
    batchId,
    candyMachine,
    metadataUris,
    merkleRoot,
    snapshotTime,
  } = params;

  // Validation
  if (metadataUris.length === 0) {
    throw new Error("Batch must have at least one metadata URI");
  }

  if (!merkleRoot || merkleRoot.length !== 32) {
    throw new Error("Merkle root must be exactly 32 bytes");
  }
  if (!merkleRoot.some((b) => b !== 0)) {
    throw new Error("Merkle root cannot be zero");
  }

  // Derive PDAs
  const [globalPDA] = getGlobalPDA();
  const [batchPDA] = getBatchPDA(batchId);

  // Use current timestamp if not provided
  const timestamp = snapshotTime || Math.floor(Date.now() / 1000);

  console.log("Publishing batch with params:", {
    batchId,
    authority: authority.toBase58(),
    candyMachine: candyMachine.toBase58(),
    metadataUris: metadataUris.length,
    snapshotTime: timestamp,
    batchPDA: batchPDA.toBase58(),
  });

  try {
    // IDL instruction name: publish_merkle_root → publishMerkleRoot
    // Arg order per IDL: batch_id, candy_machine, metadata_uris, merkle_root, snapshot_time
    const tx = await program.methods
      .publishMerkleRoot(
        new BN(batchId),
        candyMachine,
        metadataUris,
        Array.from(merkleRoot),
        new BN(timestamp)
      )
      .accounts({
        global: globalPDA,
        batch: batchPDA,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Batch published successfully! Signature:", tx);

    return {
      signature: tx,
      batchPDA,
      batchId,
    };
  } catch (error: any) {
    console.error("Error publishing batch:", error);

    // Check if batch already exists
    if (error.message?.includes("already in use")) {
      throw new Error(`Batch ${batchId} already exists`);
    }

    throw new Error(`Failed to publish batch: ${error.message || error}`);
  }
}

/**
 * Update batch metadata URIs (if you want to add this functionality)
 */
export async function updateBatchMetadata(
  program: Program,
  authority: PublicKey,
  batchId: number,
  metadataUris: string[]
): Promise<string> {
  if (metadataUris.length === 0) {
    throw new Error("Must provide at least one metadata URI");
  }

  const [globalPDA] = getGlobalPDA();
  const [batchPDA] = getBatchPDA(batchId);

  console.log("Updating batch metadata:", {
    batchId,
    authority: authority.toBase58(),
    newUriCount: metadataUris.length,
  });

  try {
    // Note: This assumes you have an update_batch instruction in your program
    // If not, you'll need to add it to the Solana program first
    const tx = await program.methods
      .updateBatch(new BN(batchId), metadataUris)
      .accounts({
        global: globalPDA,
        batch: batchPDA,
        authority: authority,
      })
      .rpc();

    console.log("Batch updated successfully! Signature:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error updating batch:", error);
    throw new Error(`Failed to update batch: ${error.message || error}`);
  }
}
