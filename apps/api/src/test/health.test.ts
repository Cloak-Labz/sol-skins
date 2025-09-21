import { describe, it, expect } from 'vitest';
import { build } from '../index';

describe('Health Check', () => {
  it('should return health status', async () => {
    const app = build({ logger: false });
    
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
    });
  });
});
