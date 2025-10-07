import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getGlobalPDA, getBatchPDA, getBoxStatePDA, getVrfPendingPDA } from '../utils/pda';
import { fetchBoxState } from '../accounts/fetch';

export interface OpenBoxParams {
  program: Program;
  boxAsset: PublicKey;
  owner: PublicKey;
  poolSize: number;
}

export interface OpenBoxResult {
  signature: string;
  vrfRequestId?: number;
}

/**
 * Open a loot box and request VRF
 */
export async function openBox(params: OpenBoxParams): Promise<OpenBoxResult> {
  const { program, boxAsset, owner, poolSize } = params;

  // Fetch box state to get batch_id
  const boxState = await fetchBoxState(program, boxAsset);
  if (!boxState) {
    throw new Error('Box state not found');
  }

  if (boxState.opened) {
    throw new Error('Box has already been opened');
  }

  if (!boxState.owner.equals(owner)) {
    throw new Error('You are not the owner of this box');
  }

  // Derive PDAs
  const [globalPDA] = getGlobalPDA();
  const [boxStatePDA] = getBoxStatePDA(boxAsset);
  const [batchPDA] = getBatchPDA(boxState.batchId);
  const [vrfPendingPDA] = getVrfPendingPDA(boxAsset);

  console.log('Opening box with params:', {
    boxAsset: boxAsset.toBase58(),
    owner: owner.toBase58(),
    poolSize,
    batchId: boxState.batchId,
  });

  try {
    const tx = await program.methods
      .openBox(new BN(poolSize))
      .accounts({
        global: globalPDA,
        boxState: boxStatePDA,
        batch: batchPDA,
        vrfPending: vrfPendingPDA,
        owner: owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Box opened successfully! Signature:', tx);
    console.log('Waiting for VRF fulfillment...');

    return {
      signature: tx,
    };
  } catch (error: any) {
    console.error('Error opening box:', error);
    throw new Error(`Failed to open box: ${error.message || error}`);
  }
}

/**
 * Check if box VRF has been fulfilled
 */
export async function checkVrfFulfilled(program: Program, boxAsset: PublicKey): Promise<boolean> {
  try {
    const boxState = await fetchBoxState(program, boxAsset);
    if (!boxState) {
      return false;
    }

    // If opened is true and randomIndex > 0, VRF has been fulfilled
    return boxState.opened && boxState.randomIndex > 0;
  } catch (error) {
    console.error('Error checking VRF status:', error);
    return false;
  }
}

/**
 * Wait for VRF fulfillment with polling
 */
export async function waitForVrf(
  program: Program,
  boxAsset: PublicKey,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const fulfilled = await checkVrfFulfilled(program, boxAsset);
    if (fulfilled) {
      console.log('VRF fulfilled!');
      return true;
    }

    console.log(`Waiting for VRF... (${i + 1}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.warn('VRF not fulfilled within timeout');
  return false;
}
