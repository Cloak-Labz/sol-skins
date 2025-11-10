import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import IDL from "./skinvault.json";
import fs from "fs";
import path from "path";

// Program ID
export const PROGRAM_ID = new PublicKey(
  "44UwMzMZUcobRp4YyucjvAbBeTFJ3uBPxg7YqwHS2ncp"
);

// Get cluster from environment
export const CLUSTER = (process.env.SOLANA_CLUSTER || "devnet") as
  | "devnet"
  | "testnet"
  | "mainnet-beta";

// RPC endpoints
const RPC_ENDPOINTS = {
  devnet: process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com",
  testnet: process.env.TESTNET_RPC_URL || "https://api.testnet.solana.com",
  "mainnet-beta":
    process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com",
};

export const RPC_ENDPOINT = RPC_ENDPOINTS[CLUSTER];

/**
 * Load admin wallet from environment or file
 * Uses ADMIN_WALLET_PRIVATE_KEY (consolidated from ADMIN_PRIVATE_KEY)
 */
export function loadAdminWallet(): Keypair {
  const privateKeyPath =
    process.env.ADMIN_WALLET_PATH || "~/.config/solana/id.json";
  
  // Try ADMIN_WALLET_PRIVATE_KEY first (primary, used by BuybackService and RevealService)
  const adminWalletPrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (adminWalletPrivateKey) {
    try {
      // Try as JSON array (bytearray format)
      const decoded = JSON.parse(adminWalletPrivateKey);
      if (Array.isArray(decoded)) {
        return Keypair.fromSecretKey(Uint8Array.from(decoded));
      }
    } catch {
      // Not JSON, try as base58
      const bs58 = require("bs58");
      try {
        return Keypair.fromSecretKey(bs58.decode(adminWalletPrivateKey));
      } catch {
        // Invalid format
        throw new Error("ADMIN_WALLET_PRIVATE_KEY must be a JSON array or base58 string");
      }
    }
  }

  // Fallback: Load from file (for local development)
  const resolvedPath = privateKeyPath.replace("~", process.env.HOME || "");
  if (fs.existsSync(resolvedPath)) {
    const keypairData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  }

  throw new Error("ADMIN_WALLET_PRIVATE_KEY not configured and no wallet file found");
}

/**
 * Get Anchor provider with admin wallet
 */
export function getProvider(): AnchorProvider {
  const adminWallet = loadAdminWallet();
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  const wallet = new Wallet(adminWallet);

  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

/**
 * Get SkinVault program instance
 */
export function getProgram(): Program {
  const provider = getProvider();
  return new Program(IDL as any, provider);
}

/**
 * Get connection (readonly)
 * Note: Use sendRawTransactionWithTimeout and confirmTransactionWithTimeout
 * from utils/solanaHelpers for operations with timeout protection
 */
export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}

console.log(`✅ Solana client initialized`);
console.log(`   Cluster: ${CLUSTER}`);
console.log(`   RPC: ${RPC_ENDPOINT}`);
console.log(`   Program ID: ${PROGRAM_ID.toBase58()}`);
