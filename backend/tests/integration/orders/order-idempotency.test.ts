import { randomUUID } from 'crypto';
import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase } from '../../setup/test-database';
import { openBusinessDay } from '../../setup/open-business-day';
import { registerOwner } from '../../setup/register-owner';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

async function seedMenu(token: string) {
  const category = await request(app)
    .post('/api/v1/menu/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Mains' });

  const item = await request(app)
    .post('/api/v1/menu/items')
    .set('Authorization', `Bearer ${token}`)
    .send({
      categoryId: category.body.data.category.id,
      name: 'Burger',
      price: '10.00',
    });

  return item.body.data.item.id as string;
}

function orderPayload(menuItemId: string, idempotencyKey: string) {
  return {
    source: 'STAFF_ASSISTED',
    idempotencyKey,
    items: [{ menuItemId, quantity: 1 }],
  };
}

describe('Order creation idempotency', () => {
  it('returns the same order for repeated idempotency keys', async () => {
    const slug = `idem-${Date.now()}`;
    const register = await registerOwner(app, slug);
    expect(register.status).toBe(201);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);
    const menuItemId = await seedMenu(token);
    const key = randomUUID();

    const first = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload(menuItemId, key));

    expect(first.status).toBe(201);
    expect(first.body.data.idempotentReplay).toBe(false);

    const second = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload(menuItemId, key));

    expect(second.status).toBe(200);
    expect(second.body.data.idempotentReplay).toBe(true);
    expect(second.body.data.order.id).toBe(first.body.data.order.id);

    const lookup = await request(app)
      .get(`/api/v1/orders/idempotency/${key}`)
      .set('Authorization', `Bearer ${token}`);

    expect(lookup.status).toBe(200);
    expect(lookup.body.data.order.id).toBe(first.body.data.order.id);
  });

  it('creates separate orders for different idempotency keys', async () => {
    const slug = `idem-two-${Date.now()}`;
    const register = await registerOwner(app, slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);
    const menuItemId = await seedMenu(token);

    const a = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload(menuItemId, randomUUID()));

    const b = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload(menuItemId, randomUUID()));

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data.order.id).not.toBe(b.body.data.order.id);
  });

  it('isolates idempotency keys per tenant', async () => {
    const slugA = `idem-a-${Date.now()}`;
    const slugB = `idem-b-${Date.now()}`;
    const regA = await registerOwner(app, slugA);
    const regB = await registerOwner(app, slugB);
    const tokenA = regA.body.data.accessToken;
    const tokenB = regB.body.data.accessToken;
    await openBusinessDay(app, tokenA);
    await openBusinessDay(app, tokenB);
    const itemA = await seedMenu(tokenA);
    const itemB = await seedMenu(tokenB);
    const sharedKey = randomUUID();

    const orderA = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(orderPayload(itemA, sharedKey));

    const orderB = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(orderPayload(itemB, sharedKey));

    expect(orderA.status).toBe(201);
    expect(orderB.status).toBe(201);
    expect(orderA.body.data.order.id).not.toBe(orderB.body.data.order.id);
  });

  it('handles concurrent duplicate submissions with one order', async () => {
    const slug = `idem-race-${Date.now()}`;
    const register = await registerOwner(app, slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);
    const menuItemId = await seedMenu(token);
    const key = randomUUID();

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${token}`)
          .send(orderPayload(menuItemId, key)),
      ),
    );

    const ok = results.filter((r) => r.status === 200 || r.status === 201);
    expect(ok.length).toBe(8);
    const ids = new Set(ok.map((r) => r.body.data.order.id));
    expect(ids.size).toBe(1);
  });
});
