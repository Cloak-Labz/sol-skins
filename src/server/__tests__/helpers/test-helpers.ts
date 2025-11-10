import { DataSource } from 'typeorm';
import { PublicKey, Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { User } from '../../entities/User';
import { Box } from '../../entities/Box';
import { BoxSkin } from '../../entities/BoxSkin';
import { SkinTemplate, SkinRarity, SkinCondition } from '../../entities/SkinTemplate';
import { testDataSource } from '../e2e-setup';
import { Express } from 'express';
import request from 'supertest';

/**
 * Generate a test Solana keypair
 */
export function generateTestKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Sign a message with a keypair (for testing wallet signatures)
 */
export function signMessage(message: string, keypair: Keypair): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(signature);
}

/**
 * Generate a nonce for testing
 */
export function generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  walletAddress: string,
  options: Partial<User> = {}
): Promise<User> {
  const userRepo = testDataSource.getRepository(User);
  
  const user = userRepo.create({
    walletAddress,
    username: options.username || `test-user-${Date.now()}`,
    email: options.email || `test-${Date.now()}@example.com`,
    tradeUrl: options.tradeUrl || 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=test',
    ...options,
  });

  return await userRepo.save(user);
}

/**
 * Create a test box
 */
export async function createTestBox(
  options: Partial<Box> = {}
): Promise<Box> {
  const boxRepo = testDataSource.getRepository(Box);
  
  const box = boxRepo.create({
    name: options.name || `Test Box ${Date.now()}`,
    description: options.description || 'Test box description',
    priceSol: options.priceSol || 0.1,
    imageUrl: options.imageUrl || 'https://example.com/box.png',
    candyMachine: options.candyMachine || Keypair.generate().publicKey.toBase58(),
    collectionMint: options.collectionMint || Keypair.generate().publicKey.toBase58(),
    merkleRoot: options.merkleRoot || 'test-merkle-root',
    metadataUris: options.metadataUris || [],
    snapshotTime: options.snapshotTime || Date.now(),
    totalItems: options.totalItems || 100,
    itemsAvailable: options.itemsAvailable || 100,
    itemsOpened: options.itemsOpened || 0,
    status: options.status || 'active',
    isSynced: options.isSynced !== undefined ? options.isSynced : true,
    ...options,
  });

  return await boxRepo.save(box);
}

/**
 * Create a test box skin
 */
export async function createTestBoxSkin(
  boxId: string,
  options: Partial<BoxSkin> = {}
): Promise<BoxSkin> {
  const boxSkinRepo = testDataSource.getRepository(BoxSkin);
  
  const boxSkin = boxSkinRepo.create({
    boxId,
    weapon: options.weapon || 'AK-47',
    name: options.name || 'Redline',
    rarity: options.rarity || 'Rare',
    condition: options.condition || 'Factory New',
    weight: options.weight || 1,
    basePriceUsd: options.basePriceUsd || 10.0,
    imageUrl: options.imageUrl || 'https://example.com/skin.png',
    ...options,
  });

  return await boxSkinRepo.save(boxSkin);
}

/**
 * Create a test skin template
 */
export async function createTestSkinTemplate(
  options: Partial<SkinTemplate> = {}
): Promise<SkinTemplate> {
  const templateRepo = testDataSource.getRepository(SkinTemplate);
  
  const template = templateRepo.create({
    weapon: options.weapon || 'AK-47',
    skinName: options.skinName || 'Redline',
    rarity: options.rarity || SkinRarity.RARE,
    condition: options.condition || SkinCondition.FACTORY_NEW,
    basePriceUsd: options.basePriceUsd || 10.0,
    imageUrl: options.imageUrl || 'https://example.com/skin.png',
    ...options,
  });

  return await templateRepo.save(template);
}

/**
 * Get CSRF token from API
 */
export async function getCSRFToken(app: Express): Promise<string> {
  const response = await request(app).get('/api/v1/csrf-token');
  if (!response.body.data?.csrfToken) {
    throw new Error(`Failed to get CSRF token. Response: ${JSON.stringify(response.body)}`);
  }
  return response.body.data.csrfToken;
}

/**
 * Create authenticated request headers
 */
export async function createAuthHeaders(
  app: any,
  walletAddress: string,
  keypair: Keypair,
  message?: string
): Promise<{ [key: string]: string }> {
  const csrfToken = await getCSRFToken(app);
  const nonce = generateNonce();
  const timestamp = Date.now().toString();
  
  const authMessage = message || `Authenticate ${walletAddress}\n\nTimestamp: ${timestamp}`;
  const signature = signMessage(authMessage, keypair);

  return {
    'x-csrf-token': csrfToken,
    'x-wallet-address': walletAddress,
    'Content-Type': 'application/json',
  };
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Mock Solana RPC responses
 */
export const mockSolanaRPC = {
  getLatestBlockhash: () => ({
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 1000000,
  }),
  sendTransaction: () => 'mock-transaction-signature',
  confirmTransaction: () => ({
    value: {
      err: null,
      slot: 1000000,
    },
  }),
  getTransaction: () => ({
    meta: {
      err: null,
    },
    transaction: {
      message: {
        accountKeys: [],
        instructions: [],
      },
    },
  }),
};

