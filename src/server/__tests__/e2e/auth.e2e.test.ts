import request from 'supertest';
import { Express } from 'express';
import { Keypair } from '@solana/web3.js';
import { generateTestKeypair, signMessage, generateNonce, getCSRFToken } from '../helpers/test-helpers';
import { testDataSource, setupAppDataSourceForTests } from '../e2e-setup';
import { User } from '../../entities/User';

describe('Authentication E2E Tests', () => {
  let app: Express;
  let testKeypair: Keypair;
  let walletAddress: string;

  beforeAll(async () => {
    // Ensure AppDataSource is set up before creating app
    await setupAppDataSourceForTests();
    
    // Import createApp after AppDataSource is configured
    const { createApp } = await import('../../app');
    app = await createApp();
    testKeypair = generateTestKeypair();
    walletAddress = testKeypair.publicKey.toBase58();
  });

  describe('POST /api/v1/auth/connect', () => {
    it('should connect wallet and create user', async () => {
      const csrfToken = await getCSRFToken(app);
      const message = `Connect wallet ${walletAddress}\n\nTimestamp: ${Date.now()}`;
      const signature = signMessage(message, testKeypair);

      const response = await request(app)
        .post('/api/v1/auth/connect')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          message,
          signature,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.walletAddress).toBe(walletAddress);
      expect(response.body.data.token).toBeDefined();

      // Verify user was created in database
      const userRepo = testDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { walletAddress } });
      expect(user).toBeDefined();
      expect(user?.walletAddress).toBe(walletAddress);
    });

    it('should reject invalid signature', async () => {
      const csrfToken = await getCSRFToken(app);
      const message = `Connect wallet ${walletAddress}\n\nTimestamp: ${Date.now()}`;
      const invalidSignature = 'invalid-signature';

      const response = await request(app)
        .post('/api/v1/auth/connect')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({
          message,
          signature: invalidSignature,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return existing user if already connected', async () => {
      const csrfToken = await getCSRFToken(app);
      const message = `Connect wallet ${walletAddress}\n\nTimestamp: ${Date.now()}`;
      const signature = signMessage(message, testKeypair);

      // First connection
      await request(app)
        .post('/api/v1/auth/connect')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({ message, signature });

      // Second connection (should return existing user)
      const response = await request(app)
        .post('/api/v1/auth/connect')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({ message, signature });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.walletAddress).toBe(walletAddress);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should get user profile with valid wallet', async () => {
      // First connect wallet
      const csrfToken = await getCSRFToken(app);
      const message = `Connect wallet ${walletAddress}\n\nTimestamp: ${Date.now()}`;
      const signature = signMessage(message, testKeypair);

      const connectResponse = await request(app)
        .post('/api/v1/auth/connect')
        .set('x-csrf-token', csrfToken)
        .set('x-wallet-address', walletAddress)
        .send({ message, signature });

      const token = connectResponse.body.data.token;

      // Get profile
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('x-wallet-address', walletAddress)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.walletAddress).toBe(walletAddress);
    });

    it('should reject request without wallet address', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

