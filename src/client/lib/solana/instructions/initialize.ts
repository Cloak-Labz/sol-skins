import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { getGlobalPDA, getTreasuryATA } from '../utils/pda';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';

export interface InitializeParams {
  program: Program;
  authority: PublicKey;
  oraclePubkey: PublicKey;
  usdcMint: PublicKey;
}

export interface InitializeResult {
  signature: string;
  globalPDA: PublicKey;
  treasuryATA: PublicKey;
}

/**
 * Initialize the SkinVault program
 *
 * This should only be called ONCE per deployment
 */
export async function initializeProgram(params: InitializeParams): Promise<InitializeResult> {
  const { program, authority, oraclePubkey, usdcMint } = params;

  // Derive PDAs
  const [globalPDA] = getGlobalPDA();

  // Get treasury ATA address
  const treasuryATA = getAssociatedTokenAddressSync(
    usdcMint,
    globalPDA,
    true, // allowOwnerOffCurve
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log('Initializing program with params:', {
    authority: authority.toBase58(),
    oraclePubkey: oraclePubkey.toBase58(),
    usdcMint: usdcMint.toBase58(),
    globalPDA: globalPDA.toBase58(),
    treasuryATA: treasuryATA.toBase58(),
  });

  try {
    const tx = await program.methods
      .initialize(oraclePubkey)
      .accounts({
        global: globalPDA,
        usdcMint: usdcMint,
        treasuryAta: treasuryATA,
        authority: authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Program initialized successfully! Signature:', tx);

    return {
      signature: tx,
      globalPDA,
      treasuryATA,
    };
  } catch (error: any) {
    console.error('Error initializing program:', error);

    // Check if already initialized
    if (error.message?.includes('already in use')) {
      throw new Error('Program is already initialized');
    }

    throw new Error(`Failed to initialize program: ${error.message || error}`);
  }
}

/**
 * Common USDC mint addresses for different clusters
 */
export const USDC_MINTS = {
  // Devnet USDC (test token)
  devnet: new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'),

  // Testnet - you may need to create your own test token
  // This is a placeholder - replace with actual testnet USDC or test token
  testnet: new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'),

  // Mainnet USDC
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
};

/**
 * Helper to get USDC mint for current cluster
 */
export function getUSDCMint(cluster: 'devnet' | 'testnet' | 'mainnet-beta'): PublicKey {
  if (cluster === 'mainnet-beta') return USDC_MINTS.mainnet;
  if (cluster === 'testnet') return USDC_MINTS.testnet;
  return USDC_MINTS.devnet;
}
