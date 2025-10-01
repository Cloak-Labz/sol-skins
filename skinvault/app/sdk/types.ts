import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export interface GlobalState {
  authority: PublicKey;
  oraclePublickey: PublicKey;
  usdcMint: PublicKey;
  buybackEnabled: boolean;
  minTreasuryBalance: BN;
  currentBatch: BN;
  totalBoxesMinted: BN;
  totalBuybacks: BN;
  totalBuybackVolume: BN;
  bump: number;
}

export interface BatchState {
  batchId: BN;
  merkleRoot: number[];
  snapshotTime: BN;
  totalItems: BN;
  boxesMinted: BN;
  boxesOpened: BN;
  bump: number;
}

export interface BoxState {
  owner: PublicKey;
  batchId: BN;
  opened: boolean;
  assignedInventory: number[];
  nftMint: PublicKey;
  mintTime: BN;
  openTime: BN;
  randomIndex: BN;
  bump: number;
}

export interface PriceStore {
  inventoryIdHash: number[];
  price: BN;
  timestamp: BN;
  oracle: PublicKey;
  updateCount: BN;
  bump: number;
}

export interface VrfPending {
  boxMint: PublicKey;
  requestId: BN;
  requestTime: BN;
  poolSize: BN;
  bump: number;
}

// Event Types
export interface MerklePublishedEvent {
  batchId: BN;
  merkleRoot: number[];
  snapshotTime: BN;
}

export interface BoxMintedEvent {
  nftMint: PublicKey;
  batchId: BN;
  owner: PublicKey;
  metadataUri: string;
}

export interface BoxOpenRequestedEvent {
  nftMint: PublicKey;
  owner: PublicKey;
  vrfRequestId?: BN;
}

export interface BoxOpenedEvent {
  nftMint: PublicKey;
  randomness: number[];
  randomIndex: BN;
  poolSize: BN;
}

export interface InventoryAssignedEvent {
  nftMint: PublicKey;
  inventoryIdHash: number[];
  batchId: BN;
}

export interface PriceSetEvent {
  inventoryIdHash: number[];
  price: BN;
  timestamp: BN;
  oracle: PublicKey;
}

export interface BuybackExecutedEvent {
  nftMint: PublicKey;
  inventoryIdHash: number[];
  price: BN;
  spreadFee: BN;
  payout: BN;
  buyer: PublicKey;
}

export interface TreasuryDepositEvent {
  amount: BN;
  depositor: PublicKey;
  newBalance: BN;
}

export interface BuybackToggledEvent {
  enabled: boolean;
  authority: PublicKey;
}

export interface OracleUpdatedEvent {
  oldOracle: PublicKey;
  newOracle: PublicKey;
  authority: PublicKey;
}

// Utility Types
export interface InventoryItem {
  id: string;
  name: string;
  rarity: string;
  description?: string;
  imageUrl?: string;
  metadataUri: string;
  estimatedValue?: number;
}

export interface BatchInfo {
  batchId: number;
  merkleRoot: string;
  snapshotTime: number;
  totalItems: number;
  items: InventoryItem[];
  proofs: { [itemId: string]: string[] };
  transaction?: string;
}

export interface PriceMessage {
  inventoryIdHash: Uint8Array;
  price: number;
  timestamp: number;
}

export interface MerkleProof {
  leaf: Uint8Array;
  proof: Uint8Array[];
  root: Uint8Array;
}

// Configuration Types
export interface SkinVaultConfig {
  programId: string;
  authority: string;
  oracle: string;
  usdcMint: string;
  globalPda: string;
  treasuryAta: string;
  cluster: "devnet" | "mainnet-beta" | "testnet";
  rpcUrl: string;
}

export interface DeploymentInfo {
  programId: string;
  authority: string;
  oracle: string;
  usdcMint: string;
  globalPda: string;
  treasuryAta: string;
  initialDeposit: number;
  deployedAt: string;
  cluster: string;
}

// Error Types
export enum SkinVaultErrorCode {
  Unauthorized = 6000,
  InvalidMerkleProof = 6001,
  VrfNotFulfilled = 6002,
  NotOpenedYet = 6003,
  AlreadyOpened = 6004,
  PriceStale = 6005,
  TreasuryInsufficient = 6006,
  BuybackDisabled = 6007,
  OracleNotSet = 6008,
  InvalidPoolSize = 6009,
  SlippageExceeded = 6010,
  InvalidSignature = 6011,
  MerkleProofTooDeep = 6012,
  InventoryAlreadyAssigned = 6013,
  InvalidTimestamp = 6014,
  OracleSignatureInvalid = 6015,
  NotBoxOwner = 6016,
  InvalidBatchId = 6017,
  ArithmeticOverflow = 6018,
}

export interface SkinVaultError {
  code: SkinVaultErrorCode;
  message: string;
}

// Client Types
export interface ClientOptions {
  commitment?: "processed" | "confirmed" | "finalized";
  preflightCommitment?: "processed" | "confirmed" | "finalized";
  skipPreflight?: boolean;
  maxRetries?: number;
}

export interface TransactionResult {
  signature: string;
  slot?: number;
  confirmationStatus?: "processed" | "confirmed" | "finalized";
}

// Helper function types
export type InventoryHashFunction = (inventoryId: string) => Uint8Array;
export type MerkleTreeBuilder = (items: InventoryItem[]) => {
  root: Uint8Array;
  proofs: { [itemId: string]: Uint8Array[] };
};
export type PriceOracleSignature = (
  message: PriceMessage,
  privateKey: Uint8Array
) => Uint8Array;
