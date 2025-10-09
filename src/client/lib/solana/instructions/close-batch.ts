import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getGlobalPDA, getBatchPDA } from "../utils/pda";

export interface CloseBatchParams {
  program: Program;
  authority: PublicKey;
  batchId: number;
}

/**
 * Close an existing batch account to reclaim rent
 * This is necessary before recreating a batch with different size
 */
export async function closeBatch(
  params: CloseBatchParams
): Promise<string> {
  const { program, authority, batchId } = params;

  // Derive PDAs
  const [globalPDA] = getGlobalPDA();
  const [batchPDA] = getBatchPDA(batchId);

  console.log("Closing batch:", {
    batchId,
    authority: authority.toBase58(),
    batchPDA: batchPDA.toBase58(),
  });

  try {
    // Check if batch exists
    const batchAccount = await program.account.batch.fetchNullable(batchPDA);
    
    if (!batchAccount) {
      console.log("Batch does not exist, nothing to close");
      return "";
    }

    console.log("Batch found, closing account to reclaim rent...");

    // Close the batch account
    // Note: You may need to add a close_batch instruction to your Solana program
    // For now, we'll try to use Anchor's automatic close functionality
    const tx = await program.methods
      .closeBatch(new BN(batchId))
      .accounts({
        global: globalPDA,
        batch: batchPDA,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Batch closed successfully! Signature:", tx);
    return tx;
  } catch (error: any) {
    console.error("Error closing batch:", error);
    
    // If the instruction doesn't exist, provide helpful error
    if (error.message?.includes("Invalid instruction")) {
      throw new Error(
        "The close_batch instruction doesn't exist in your program. " +
        "Please use a different batch_id or manually close the account."
      );
    }

    throw new Error(`Failed to close batch: ${error.message || error}`);
  }
}

/**
 * Get batch account info including its size
 */
export async function getBatchInfo(
  program: Program,
  batchId: number
): Promise<{
  exists: boolean;
  size?: number;
  numUris?: number;
  candyMachine?: PublicKey;
}> {
  try {
    const [batchPDA] = getBatchPDA(batchId);
    const batchAccount = await program.account.batch.fetchNullable(batchPDA);

    if (!batchAccount) {
      return { exists: false };
    }

    return {
      exists: true,
      size: batchAccount.metadataUris?.length || 0,
      numUris: batchAccount.metadataUris?.length || 0,
      candyMachine: batchAccount.candyMachine,
    };
  } catch (error) {
    console.error("Error fetching batch info:", error);
    return { exists: false };
  }
}


