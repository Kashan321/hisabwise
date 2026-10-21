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
      businessName: 'Floor Cafe',
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

describe('Floor plan module', () => {
  it('creates, lists, updates status, and deletes tables', async () => {
    const register = await registerOwner(`floor-${Date.now()}`);
    const token = register.body.data.accessToken;

    const create = await request(app)
      .post('/api/v1/floor-plan/tables')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tableIdentifier: 'T1',
        layoutX: 100,
        layoutY: 200,
        width: 80,
        height: 80,
        capacity: 4,
      });

    expect(create.status).toBe(201);
    expect(create.body.data.table.status).toBe('AVAILABLE');
    const tableId = create.body.data.table.id;

    const list = await request(app)
      .get('/api/v1/floor-plan/tables')
      .set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.data.tables).toHaveLength(1);

    const status = await request(app)
      .patch(`/api/v1/floor-plan/tables/${tableId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'OCCUPIED' });

    expect(status.status).toBe(200);
    expect(status.body.data.table.status).toBe('OCCUPIED');

    const move = await request(app)
      .patch(`/api/v1/floor-plan/tables/${tableId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ layoutX: 150, layoutY: 250 });

    expect(move.status).toBe(200);
    expect(move.body.data.table.layoutX).toBe(150);

    const del = await request(app)
      .delete(`/api/v1/floor-plan/tables/${tableId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(del.status).toBe(200);
  });
});
