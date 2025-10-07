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
 */
export function loadAdminWallet(): Keypair {
  const privateKeyPath =
    process.env.ADMIN_WALLET_PATH || "~/.config/solana/id.json";
  const privateKeyEnv = process.env.ADMIN_PRIVATE_KEY;

  if (privateKeyEnv) {
    // Load from environment variable (base58 or JSON array)
    try {
      const decoded = JSON.parse(privateKeyEnv);
      return Keypair.fromSecretKey(Uint8Array.from(decoded));
    } catch {
      // Try as base58
      const bs58 = require("bs58");
      return Keypair.fromSecretKey(bs58.decode(privateKeyEnv));
    }
  }

  // Load from file
  const resolvedPath = privateKeyPath.replace("~", process.env.HOME || "");
  const keypairData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(keypairData));
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
 */
export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}

console.log(`✅ Solana client initialized`);
console.log(`   Cluster: ${CLUSTER}`);
console.log(`   RPC: ${RPC_ENDPOINT}`);
console.log(`   Program ID: ${PROGRAM_ID.toBase58()}`);
