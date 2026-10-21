import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase } from '../../setup/test-database';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

async function registerOwner(slug: string, email: string) {
  return request(app)
    .post('/api/v1/auth/register')
    .send({
      businessName: 'Test Cafe',
      businessSlug: slug,
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Owner',
      email,
      password: 'password123',
    });
}

describe('Business module', () => {
  it('returns business profile for authenticated user', async () => {
    const register = await registerOwner('biz-cafe', 'owner@biz.com');

    const response = await request(app)
      .get('/api/v1/business/me')
      .set('Authorization', `Bearer ${register.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.business.slug).toBe('biz-cafe');
    expect(response.body.data.business.name).toBe('Test Cafe');
  });

  it('updates business profile', async () => {
    const register = await registerOwner('update-cafe', 'owner@update.com');

    const response = await request(app)
      .patch('/api/v1/business/me')
      .set('Authorization', `Bearer ${register.body.data.accessToken}`)
      .send({
        name: 'Updated Cafe Name',
        location: '123 Main St',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.business.name).toBe('Updated Cafe Name');
    expect(response.body.data.business.location).toBe('123 Main St');
    expect(response.body.data.business.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
