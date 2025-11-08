import request from 'supertest';
import { Express } from 'express';
import { Keypair } from '@solana/web3.js';
import {
  generateTestKeypair,
  signMessage,
  generateNonce,
  getCSRFToken,
  createTestUser,
  createTestBox,
  createTestBoxSkin,
} from '../helpers/test-helpers';
import { testDataSource, setupAppDataSourceForTests } from '../e2e-setup';
import { User } from '../../entities/User';
import { Box } from '../../entities/Box';
import { CaseOpening } from '../../entities/CaseOpening';
import { LootBoxType, LootBoxRarity } from '../../entities/LootBoxType';

describe('Pack Opening E2E Tests', () => {
  let app: Express;
  let testKeypair: Keypair;
  let walletAddress: string;
  let csrfToken: string;
  let authToken: string;
  let testBox: Box;

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

    // Create test box with skins
    testBox = await createTestBox({
      name: 'Test Pack',
      priceSol: 0.1,
      candyMachine: Keypair.generate().publicKey.toBase58(),
    });

    // Create corresponding LootBoxType for the transaction foreign key
    const lootBoxTypeRepo = testDataSource.getRepository(LootBoxType);
    let lootBoxType = await lootBoxTypeRepo.findOne({ where: { name: testBox.name } });
    if (!lootBoxType) {
      lootBoxType = lootBoxTypeRepo.create({
        name: testBox.name,
        description: testBox.description || 'Test pack',
        priceSol: Number(testBox.priceSol) || 0.1,
        priceUsdc: testBox.priceUsdc ? Number(testBox.priceUsdc) : undefined,
        rarity: LootBoxRarity.STANDARD,
      });
      await lootBoxTypeRepo.save(lootBoxType);
    }

    // Add skins to box
    await createTestBoxSkin(testBox.id, {
      weapon: 'AK-47',
      name: 'Redline',
      rarity: 'Rare',
      weight: 1,
    });

    await createTestBoxSkin(testBox.id, {
      weapon: 'M4A4',
      name: 'Desert-Strike',
      rarity: 'Uncommon',
      weight: 2,
    });

    // Update user with trade URL (required for pack opening)
    const userRepo = testDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { walletAddress } });
    if (user) {
      user.tradeUrl = 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=test';
      await userRepo.save(user);
    }
  });

  describe('POST /api/v1/pack-opening/transaction', () => {
    it('should create pack opening transaction', async () => {
      const nonce = generateNonce();
      const timestamp = Date.now().toString();

      // Mock NFT mint (in real scenario, this would come from Solana transaction)
      const nftMint = Keypair.generate().publicKey.toBase58();

      const response = await request(app)
        .post('/api/v1/pack-opening/transaction')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          userId: walletAddress,
          boxId: testBox.id,
          nftMint,
          signature: 'mock-transaction-signature',
          nonce,
          timestamp,
          skinData: {
            name: 'AK-47 | Redline',
            weapon: 'AK-47',
            rarity: 'Rare',
            basePriceUsd: 10.0,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nftMint).toBe(nftMint);

      // Verify case opening was created
      const caseOpeningRepo = testDataSource.getRepository(CaseOpening);
      const caseOpening = await caseOpeningRepo.findOne({
        where: { nftMintAddress: nftMint },
      });
      expect(caseOpening).toBeDefined();
      expect(caseOpening?.lootBoxTypeId).toBeDefined();
    });

    it('should reject pack opening without trade URL', async () => {
      // Remove trade URL from user
      const userRepo = testDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { walletAddress } });
      if (user) {
        user.tradeUrl = null;
        await userRepo.save(user);
      }

      const nonce = generateNonce();
      const timestamp = Date.now().toString();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const response = await request(app)
        .post('/api/v1/pack-opening/transaction')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          userId: walletAddress,
          boxId: testBox.id,
          nftMint,
          signature: 'mock-transaction-signature',
          nonce,
          timestamp,
          skinData: {
            name: 'AK-47 | Redline',
            weapon: 'AK-47',
            rarity: 'Rare',
            basePriceUsd: 10.0,
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate nonce', async () => {
      const nonce = generateNonce();
      const timestamp = Date.now().toString();
      const nftMint1 = Keypair.generate().publicKey.toBase58();
      const nftMint2 = Keypair.generate().publicKey.toBase58();

      // First request
      await request(app)
        .post('/api/v1/pack-opening/transaction')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          userId: walletAddress,
          boxId: testBox.id,
          nftMint: nftMint1,
          signature: 'mock-transaction-signature-1',
          nonce,
          timestamp,
          skinData: {
            name: 'AK-47 | Redline',
            weapon: 'AK-47',
            rarity: 'Rare',
            basePriceUsd: 10.0,
          },
        });

      // Second request with same nonce (should fail)
      const response = await request(app)
        .post('/api/v1/pack-opening/transaction')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          userId: walletAddress,
          boxId: testBox.id,
          nftMint: nftMint2,
          signature: 'mock-transaction-signature-2',
          nonce, // Same nonce
          timestamp,
          skinData: {
            name: 'M4A4 | Desert-Strike',
            weapon: 'M4A4',
            rarity: 'Uncommon',
            basePriceUsd: 5.0,
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.message || response.body.error || '').toMatch(/nonce/i);
    });
  });

  describe('GET /api/v1/cases/openings', () => {
    it('should get user case openings', async () => {
      // Create a case opening first
      const userRepo = testDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { walletAddress } });
      
      // Create or get LootBoxType (required for CaseOpening)
      const lootBoxTypeRepo = testDataSource.getRepository(LootBoxType);
      let lootBoxType = await lootBoxTypeRepo.findOne({ where: { name: 'Test Pack' } });
      if (!lootBoxType) {
        lootBoxType = lootBoxTypeRepo.create({
          name: 'Test Pack',
          description: 'Test pack',
          priceSol: 0.1,
          rarity: LootBoxRarity.STANDARD,
        });
        await lootBoxTypeRepo.save(lootBoxType);
      }

      const caseOpeningRepo = testDataSource.getRepository(CaseOpening);
      const caseOpening = caseOpeningRepo.create({
        userId: user!.id,
        lootBoxTypeId: lootBoxType.id,
        nftMintAddress: Keypair.generate().publicKey.toBase58(),
        skinName: 'AK-47 | Redline',
        skinRarity: 'Rare',
        skinValue: 10.0,
        isPackOpening: true,
        openedAt: new Date(),
      });
      await caseOpeningRepo.save(caseOpening);

      const response = await request(app)
        .get('/api/v1/cases/openings')
        .set('x-wallet-address', walletAddress);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});

