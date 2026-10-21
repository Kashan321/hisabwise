import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase } from '../../setup/test-database';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

describe('POST /api/v1/auth/register', () => {
  it('registers a new business owner', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      businessName: 'Venta Downtown',
      businessSlug: 'venta-downtown',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Jane Owner',
      email: 'owner@venta.com',
      password: 'password123',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('owner@venta.com');
    expect(response.body.data.user.roles).toContain('owner');
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send({
      businessName: 'First Cafe',
      businessSlug: 'first-cafe-email',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Owner One',
      email: 'shared@cafe.com',
      password: 'password123',
    });

    const response = await request(app).post('/api/v1/auth/register').send({
      businessName: 'Second Cafe',
      businessSlug: 'second-cafe-email',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Owner Two',
      email: 'shared@cafe.com',
      password: 'password123',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('rejects duplicate slug', async () => {
    await request(app).post('/api/v1/auth/register').send({
      businessName: 'First Cafe',
      businessSlug: 'same-slug',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Owner One',
      email: 'one@cafe.com',
      password: 'password123',
    });

    const response = await request(app).post('/api/v1/auth/register').send({
      businessName: 'Second Cafe',
      businessSlug: 'same-slug',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Owner Two',
      email: 'two@cafe.com',
      password: 'password123',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_SLUG');
  });

  it('rejects weak password', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      businessName: 'Test Cafe',
      businessSlug: 'test-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Test User',
      email: 'test@cafe.com',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
