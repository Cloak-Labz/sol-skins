import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import IDL from '../../idl/skinvault.json';

export const PROGRAM_ID = new PublicKey('5q1sgnwz8tTqfMJm1Hub4uziaGSZGZhdw1JgyGoERtwQ');

// Network configuration
export type ClusterType = 'devnet' | 'testnet' | 'mainnet-beta';

const RPC_ENDPOINTS: Record<ClusterType, string> = {
  'devnet': 'https://api.devnet.solana.com',
  'testnet': 'https://api.testnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};

// Get cluster from environment or default to devnet
const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as ClusterType) || 'devnet';

export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || RPC_ENDPOINTS[CLUSTER];

console.log(`🔗 Solana cluster: ${CLUSTER}`);
console.log(`🔗 RPC endpoint: ${RPC_ENDPOINT}`);

/**
 * Get Anchor provider from wallet
 */
export function getProvider(wallet: AnchorWallet, connection?: Connection): AnchorProvider {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');
  return new AnchorProvider(conn, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}

/**
 * Get SkinVault program instance
 */
export function getProgram(provider: AnchorProvider): Program {
  return new Program(IDL as Idl, provider);
}

/**
 * Get program from wallet (convenience function)
 */
export function getProgramFromWallet(wallet: AnchorWallet, connection?: Connection): Program {
  const provider = getProvider(wallet, connection);
  return getProgram(provider);
}

/**
 * Get readonly connection
 */
export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, 'confirmed');
}
