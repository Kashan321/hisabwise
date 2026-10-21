import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase } from '../../setup/test-database';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

async function registerUser(slug: string, email: string) {
  return request(app).post('/api/v1/auth/register').send({
    businessName: `Cafe ${slug}`,
    businessSlug: slug,
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
    name: 'Test Owner',
    email,
    password: 'password123',
  });
}

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await registerUser('login-cafe', 'login@cafe.com');
  });

  it('logs in with valid credentials', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      businessSlug: 'login-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'login@cafe.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.user.email).toBe('login@cafe.com');
    expect(response.body.data.user.businessSlug).toBe('login-cafe');
  });

  it('logs in with email and password only', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'login@cafe.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.user.email).toBe('login@cafe.com');
    expect(response.body.data.user.businessSlug).toBe('login-cafe');
    expect(response.body.data.user.roles).toContain('OWNER');
  });

  it('rejects invalid password', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      businessSlug: 'login-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'login@cafe.com',
      password: 'wrongpassword',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects unknown email', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      businessSlug: 'login-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'unknown@cafe.com',
      password: 'password123',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
