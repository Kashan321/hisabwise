import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase } from '../../setup/test-database';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

describe('POST /api/v1/auth/refresh', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send({
      businessName: 'Refresh Cafe',
      businessSlug: 'refresh-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Refresh Owner',
      email: 'refresh@cafe.com',
      password: 'password123',
    });
  });

  it('rotates refresh token and returns new access token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      businessSlug: 'refresh-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'refresh@cafe.com',
      password: 'password123',
    });

    const cookies = login.headers['set-cookie'];

    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookies);

    expect(refresh.status).toBe(200);
    expect(refresh.body.data.accessToken).toBeDefined();
    expect(refresh.headers['set-cookie']).toBeDefined();
  });

  it('rejects reused refresh token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      businessSlug: 'refresh-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'refresh@cafe.com',
      password: 'password123',
    });

    const cookies = login.headers['set-cookie'];

    await request(app).post('/api/v1/auth/refresh').set('Cookie', cookies);

    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookies);

    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('TOKEN_REUSED');
  });
});
