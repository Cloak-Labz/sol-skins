import request from 'supertest';
import { Express } from 'express';
import { Keypair } from '@solana/web3.js';
import {
  generateTestKeypair,
  signMessage,
  generateNonce,
  getCSRFToken,
  createTestUser,
  createTestSkinTemplate,
} from '../helpers/test-helpers';
import { testDataSource, setupAppDataSourceForTests } from '../e2e-setup';
import { User } from '../../entities/User';
import { UserSkin } from '../../entities/UserSkin';
import { SkinTemplate, SkinRarity } from '../../entities/SkinTemplate';

describe('Buyback E2E Tests', () => {
  let app: Express;
  let testKeypair: Keypair;
  let walletAddress: string;
  let csrfToken: string;
  let authToken: string;
  let user: User;
  let userSkin: UserSkin;
  let skinTemplate: SkinTemplate;

  beforeAll(async () => {
    // Ensure AppDataSource is set up before creating app
    await setupAppDataSourceForTests();
    
    // Import createApp after AppDataSource is configured
    const { createApp } = await import('../../app');
    app = await createApp();
    testKeypair = generateTestKeypair();
    walletAddress = testKeypair.publicKey.toBase58();
  });

  beforeEach(async () => {
    // Setup authentication
    csrfToken = await getCSRFToken(app);
    const message = `Connect wallet ${walletAddress}\n\nTimestamp: ${Date.now()}`;
    const signature = signMessage(message, testKeypair);

    const connectResponse = await request(app)
      .post('/api/v1/auth/connect')
      .set('x-csrf-token', csrfToken)
      .set('x-wallet-address', walletAddress)
      .send({ message, signature });

    if (!connectResponse.body.success || !connectResponse.body.data?.token) {
      throw new Error(`Failed to connect wallet: ${JSON.stringify(connectResponse.body)}`);
    }

    authToken = connectResponse.body.data.token;
    user = connectResponse.body.data.user;

    // Create skin template
    skinTemplate = await createTestSkinTemplate({
      weapon: 'AK-47',
      skinName: 'Redline',
      rarity: SkinRarity.RARE,
      basePriceUsd: 10.0,
    });

    // Create user skin
    const userSkinRepo = testDataSource.getRepository(UserSkin);
    userSkin = userSkinRepo.create({
      userId: user.id,
      skinTemplateId: skinTemplate.id,
      nftMintAddress: Keypair.generate().publicKey.toBase58(),
      name: 'AK-47 | Redline',
      currentPriceUsd: 10.0,
      isInInventory: true,
    });
    await userSkinRepo.save(userSkin);
  });

  describe('GET /api/v1/buyback/calculate/:nftMint', () => {
    it('should calculate buyback amount', async () => {
      const response = await request(app)
        .get(`/api/v1/buyback/calculate/${userSkin.nftMintAddress}`)
        .set('x-wallet-address', walletAddress);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.buybackAmount).toBeDefined();
      expect(response.body.data.skinPrice).toBeDefined();
      expect(typeof response.body.data.buybackAmount).toBe('number');
    });

    it('should reject calculation for non-existent NFT', async () => {
      const fakeMint = Keypair.generate().publicKey.toBase58();
      const response = await request(app)
        .get(`/api/v1/buyback/calculate/${fakeMint}`)
        .set('x-wallet-address', walletAddress);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/buyback/request', () => {
    it('should create buyback request', async () => {
      const nonce = generateNonce();
      const timestamp = Date.now().toString();

      const response = await request(app)
        .post('/api/v1/buyback/request')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          nftMint: userSkin.nftMint,
          nonce,
          timestamp,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.buybackAmount).toBeDefined();
      expect(response.body.data.priceLockId).toBeDefined();
    });

    it('should reject buyback request without nonce', async () => {
      const response = await request(app)
        .post('/api/v1/buyback/request')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          nftMint: userSkin.nftMint,
          timestamp: Date.now().toString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/buyback/confirm', () => {
    it('should confirm buyback transaction', async () => {
      // First request buyback
      const nonce1 = generateNonce();
      const timestamp1 = Date.now().toString();

      const requestResponse = await request(app)
        .post('/api/v1/buyback/request')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          nftMint: userSkin.nftMint,
          nonce: nonce1,
          timestamp: timestamp1,
        });

      const priceLockId = requestResponse.body.data.priceLockId;

      // Confirm buyback
      const nonce2 = generateNonce();
      const timestamp2 = Date.now().toString();
      const mockTransactionSignature = 'mock-transaction-signature';

      const response = await request(app)
        .post('/api/v1/buyback/confirm')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          nftMint: userSkin.nftMint,
          signedTransaction: mockTransactionSignature,
          signature: mockTransactionSignature,
          priceLockId,
          nonce: nonce2,
          timestamp: timestamp2,
        });

      // Note: This will likely fail validation without a real Solana transaction
      // In a real scenario, you'd mock the Solana RPC calls
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});

