import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase } from '../../setup/test-database';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

async function registerOwner(slug: string) {
  return request(app)
    .post('/api/v1/auth/register')
    .send({
      businessName: 'Files Cafe',
      businessSlug: slug,
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Owner',
      email: `owner@${slug}.com`,
      password: 'password123',
    });
}

describe('Files module', () => {
  it('rejects upload without a file', async () => {
    const slug = `files-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;

    const response = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/file is required/i);
  });

  it('rejects unsupported file types', async () => {
    const slug = `files-type-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;

    const response = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
  });
});
