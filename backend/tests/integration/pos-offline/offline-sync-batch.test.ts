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

describe('POS offline batch sync', () => {
  it('registers a device prefix and maps offline tickets on idempotent sync', async () => {
    const slug = `offline-${Date.now()}`;
    const register = await registerOwner(app, slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);
    const menuItemId = await seedMenu(token);
    const deviceKey = randomUUID();

    const deviceRes = await request(app)
      .post('/api/v1/pos/devices/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceKey, label: 'Counter iPad' });

    expect(deviceRes.status).toBe(200);
    expect(deviceRes.body.data.device.ticketPrefix).toMatch(/^[A-Z]/);

    const idempotencyKey = randomUUID();
    const payload = {
      orders: [
        {
          source: 'STAFF_ASSISTED',
          orderType: 'TAKEAWAY',
          idempotencyKey,
          deviceKey,
          offlineTicketNumber: 42,
          offlineTicketLabel: `${deviceRes.body.data.device.ticketPrefix}-042`,
          completeWithCash: { amountReceived: 12, changeGiven: 2 },
          items: [{ menuItemId, quantity: 1 }],
        },
      ],
    };

    const first = await request(app)
      .post('/api/v1/pos/orders/sync-batch')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(first.status).toBe(200);
    expect(first.body.data.results).toHaveLength(1);
    expect(first.body.data.results[0].success).toBe(true);
    expect(first.body.data.results[0].offlineTicketLabel).toBe(
      deviceRes.body.data.device.ticketPrefix + '-042',
    );
    expect(first.body.data.results[0].serverTicketLabel).toBeTruthy();
    const serverTicket = first.body.data.results[0].serverTicketLabel as string;
    const orderId = first.body.data.results[0].orderId as string;

    const duplicate = await request(app)
      .post('/api/v1/pos/orders/sync-batch')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data.results[0].idempotentReplay).toBe(true);
    expect(duplicate.body.data.results[0].orderId).toBe(orderId);
    expect(duplicate.body.data.results[0].serverTicketLabel).toBe(serverTicket);

    const lookup = await request(app)
      .get(`/api/v1/orders/idempotency/${idempotencyKey}`)
      .set('Authorization', `Bearer ${token}`);

    expect(lookup.status).toBe(200);
    expect(lookup.body.data.order.id).toBe(orderId);
    expect(lookup.body.data.order.status).toBe('COMPLETED');
    expect(lookup.body.data.order.paymentMethod).toBe('CASH');
    expect(lookup.body.data.order.offlineTicketLabel).toBe(
      deviceRes.body.data.device.ticketPrefix + '-042',
    );
  });
});
