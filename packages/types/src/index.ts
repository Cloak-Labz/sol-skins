// Core domain types
export interface User {
  id: string;
  walletAddress: string;
  createdAt: Date;
}

export interface LootBox {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: Date;
}

export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type SkinStatus = 'available' | 'reserved' | 'assigned' | 'returned' | 'burned' | 'back_to_pool';
export type UserSkinStatus = 'owned' | 'burned' | 'buybacked';
export type TransactionType = 'open_box' | 'buyback' | 'payout';
export type TransactionStatus = 'pending' | 'success' | 'failed';
export type TreasuryTxType = 'deposit' | 'buyback' | 'fee' | 'withdraw';

export interface Skin {
  id: string;
  name: string;
  rarity: SkinRarity;
  marketCategory: string;
  metadata: Record<string, any>;
  priceRef: number;
  lootBoxId: string;
  status: SkinStatus;
  inventoryRef: string;
  assignedNft?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSkin {
  id: string;
  userId: string;
  skinId: string;
  nftMint: string;
  status: UserSkinStatus;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  lootBoxId: string;
  skinId?: string;
  type: TransactionType;
  txSignature: string;
  amount: number;
  status: TransactionStatus;
  createdAt: Date;
}

export interface MerkleSnapshot {
  id: string;
  merkleRoot: string;
  createdAt: Date;
  operatorSig: string;
  totalItems: number;
}

export interface Assignment {
  id: string;
  nftMint: string;
  inventoryId: string;
  randomness: string;
  proof: Record<string, any>;
  backendSig: string;
  txSignature: string;
  createdAt: Date;
}

export interface TreasuryLedger {
  id: string;
  txType: TreasuryTxType;
  amount: number;
  currency: string;
  txRef: string;
  createdAt: Date;
}

// Anchor events
export interface BoxOpenedEvent {
  nftMint: string;
  randomness: string;
  batchId: string;
}

export interface AssignedEvent {
  nftMint: string;
  inventoryIdHash: string;
}

export interface BuybackEvent {
  nftMint: string;
  amount: number;
}

// API DTOs
export interface CreateUserRequest {
  walletAddress: string;
}

export interface OpenBoxRequest {
  lootBoxId: string;
  walletAddress: string;
}

export interface BuybackRequest {
  skinId: string;
  walletAddress: string;
  minAcceptable: number;
}

export interface PriceData {
  id: string;
  price: number;
  timestamp: number;
  signature: string;
  pubkey: string;
}

export interface MerkleProof {
  leaf: string;
  path: string[];
  root: string;
}

export interface OraclePrice {
  inventoryId: string;
  price: number;
  timestamp: number;
  signature: string;
  pubkey: string;
}

export interface BuybackQuote {
  skinId: string;
  oraclePrice: number;
  fee: number;
  spread: number;
  effectivePrice: number;
  canBuyback: boolean;
  reason?: string;
}

// Zod schemas
import { z } from 'zod';

export const CreateUserSchema = z.object({
  walletAddress: z.string().min(1),
});

export const OpenBoxSchema = z.object({
  lootBoxId: z.string().min(1),
  walletAddress: z.string().min(1),
});

export const BuybackSchema = z.object({
  skinId: z.string().min(1),
  walletAddress: z.string().min(1),
  minAcceptable: z.number().positive(),
});

export const PriceDataSchema = z.object({
  id: z.string(),
  price: z.number().positive(),
  timestamp: z.number(),
  signature: z.string(),
  pubkey: z.string(),
});

export const MerkleProofSchema = z.object({
  leaf: z.string(),
  path: z.array(z.string()),
  root: z.string(),
});

export const OraclePriceSchema = z.object({
  inventoryId: z.string(),
  price: z.number().positive(),
  timestamp: z.number(),
  signature: z.string(),
  pubkey: z.string(),
});

// Utility types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
