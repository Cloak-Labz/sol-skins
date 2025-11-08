import request from 'supertest';
import { Express } from 'express';
import { Keypair } from '@solana/web3.js';
import {
  generateTestKeypair,
  signMessage,
  getCSRFToken,
  createTestSkinTemplate,
} from '../helpers/test-helpers';
import { testDataSource, setupAppDataSourceForTests } from '../e2e-setup';
import { User } from '../../entities/User';
import { UserSkin } from '../../entities/UserSkin';
import { SkinTemplate, SkinRarity, SkinCondition } from '../../entities/SkinTemplate';

describe('Inventory E2E Tests', () => {
  let app: Express;
  let testKeypair: Keypair;
  let walletAddress: string;
  let csrfToken: string;
  let authToken: string;
  let user: User;
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
  });

  describe('GET /api/v1/inventory', () => {
    it('should get empty inventory for new user', async () => {
      const response = await request(app)
        .get('/api/v1/inventory')
        .set('x-wallet-address', walletAddress);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should get inventory with user skins', async () => {
      // Create user skins
      const userSkinRepo = testDataSource.getRepository(UserSkin);
      
      const skin1 = userSkinRepo.create({
        userId: user.id,
        skinTemplateId: skinTemplate.id,
        nftMintAddress: Keypair.generate().publicKey.toBase58(),
        name: 'AK-47 | Redline',
        currentPriceUsd: 10.0,
        isInInventory: true,
      });

      const skin2 = userSkinRepo.create({
        userId: user.id,
        skinTemplateId: skinTemplate.id,
        nftMintAddress: Keypair.generate().publicKey.toBase58(),
        name: 'AK-47 | Redline',
        currentPriceUsd: 10.0,
        isInInventory: true,
      });

      await userSkinRepo.save([skin1, skin2]);

      const response = await request(app)
        .get('/api/v1/inventory')
        .set('x-wallet-address', walletAddress);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].name).toBe('AK-47 | Redline');
    });

    it('should filter inventory by rarity', async () => {
      // Create skins with different rarities (use unique names to avoid duplicate constraint)
      const rareTemplate = await createTestSkinTemplate({
        weapon: 'AK-47',
        skinName: `Redline-${Date.now()}-${Math.random()}`,
        rarity: SkinRarity.RARE,
        condition: SkinCondition.FACTORY_NEW,
        basePriceUsd: 10.0,
      });

      const uncommonTemplate = await createTestSkinTemplate({
        weapon: 'M4A4',
        skinName: `Desert-Strike-${Date.now()}-${Math.random()}`,
        rarity: SkinRarity.UNCOMMON,
        condition: SkinCondition.FACTORY_NEW,
        basePriceUsd: 5.0,
      });

      const userSkinRepo = testDataSource.getRepository(UserSkin);
      
      await userSkinRepo.save([
        userSkinRepo.create({
          userId: user.id,
          skinTemplateId: rareTemplate.id,
          nftMintAddress: Keypair.generate().publicKey.toBase58(),
          name: 'AK-47 | Redline',
          currentPriceUsd: 10.0,
          isInInventory: true,
        }),
        userSkinRepo.create({
          userId: user.id,
          skinTemplateId: uncommonTemplate.id,
          nftMintAddress: Keypair.generate().publicKey.toBase58(),
          name: 'M4A4 | Desert-Strike',
          currentPriceUsd: 5.0,
          isInInventory: true,
        }),
      ]);

      const response = await request(app)
        .get('/api/v1/inventory?filterBy=rare')
        .set('x-wallet-address', walletAddress);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('AK-47 | Redline');
    });
  });

  describe('GET /api/v1/inventory/value', () => {
    it('should calculate inventory value', async () => {
      // Create user skins
      const userSkinRepo = testDataSource.getRepository(UserSkin);
      
      await userSkinRepo.save([
        userSkinRepo.create({
          userId: user.id,
          skinTemplateId: skinTemplate.id,
          nftMintAddress: Keypair.generate().publicKey.toBase58(),
          name: 'AK-47 | Redline',
          currentPriceUsd: 10.0,
          isInInventory: true,
        }),
        userSkinRepo.create({
          userId: user.id,
          skinTemplateId: skinTemplate.id,
          nftMintAddress: Keypair.generate().publicKey.toBase58(),
          name: 'AK-47 | Redline',
          currentPriceUsd: 10.0,
          isInInventory: true,
        }),
      ]);

      const response = await request(app)
        .get('/api/v1/inventory/value')
        .set('x-wallet-address', walletAddress);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalValue).toBe(20.0);
      expect(response.body.data.totalItems).toBe(2);
      expect(response.body.data.rarityBreakdown).toBeDefined();
    });
  });
});

