import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../index';
import { prisma } from './setup';

describe('Loot Boxes API', () => {
  let app: any;

  beforeEach(async () => {
    app = build({ logger: false });
    
    // Create test data
    await prisma.lootBox.create({
      data: {
        id: 'test-box',
        name: 'Test Box',
        description: 'A test loot box',
        price: 25.00,
      },
    });
  });

  it('should get all loot boxes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lootboxes',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].name).toBe('Test Box');
  });

  it('should get loot box by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lootboxes/test-box',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Box');
  });

  it('should return 404 for non-existent loot box', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lootboxes/non-existent',
    });

    expect(response.statusCode).toBe(404);
  });

  it('should create open box request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/lootboxes/open',
      payload: {
        lootBoxId: 'test-box',
        walletAddress: 'test-wallet-address',
      },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.data.lootBoxId).toBe('test-box');
    expect(data.data.price).toBe(25.00);
  });
});
