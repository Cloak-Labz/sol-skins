import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { getGlobalPDA, getBoxStatePDA } from '../utils/pda';

export interface CreateBoxParams {
  program: Program;
  batchId: number;
  owner: PublicKey;
  boxAsset?: Keypair; // Optional: if not provided, a new keypair will be generated
}

export interface CreateBoxResult {
  signature: string;
  boxAsset: PublicKey;
  boxStatePDA: PublicKey;
}

/**
 * Create a new loot box
 */
export async function createBox(params: CreateBoxParams): Promise<CreateBoxResult> {
  const { program, batchId, owner, boxAsset: providedAsset } = params;

  // Generate or use provided asset keypair
  const boxAsset = providedAsset || Keypair.generate();

  // Derive PDAs
  const [globalPDA] = getGlobalPDA();
  const [boxStatePDA] = getBoxStatePDA(boxAsset.publicKey);

  console.log('Creating box with params:', {
    batchId,
    owner: owner.toBase58(),
    boxAsset: boxAsset.publicKey.toBase58(),
    boxStatePDA: boxStatePDA.toBase58(),
  });

  try {
    const tx = await program.methods
      .createBox(new BN(batchId))
      .accounts({
        global: globalPDA,
        boxState: boxStatePDA,
        owner: owner,
        boxAsset: boxAsset.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers(providedAsset ? [boxAsset] : [])
      .rpc();

    console.log('Box created successfully! Signature:', tx);

    return {
      signature: tx,
      boxAsset: boxAsset.publicKey,
      boxStatePDA,
    };
  } catch (error: any) {
    console.error('Error creating box:', error);
    throw new Error(`Failed to create box: ${error.message || error}`);
  }
}

/**
 * Create multiple boxes in a single transaction (batched)
 */
export async function createBoxBatch(
  program: Program,
  batchId: number,
  owner: PublicKey,
  count: number
): Promise<CreateBoxResult[]> {
  const results: CreateBoxResult[] = [];

  for (let i = 0; i < count; i++) {
    const result = await createBox({
      program,
      batchId,
      owner,
    });
    results.push(result);
  }

  return results;
}
