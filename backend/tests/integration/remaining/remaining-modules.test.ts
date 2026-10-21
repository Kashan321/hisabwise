import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase } from '../../setup/test-database';
import { openBusinessDay } from '../../setup/open-business-day';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

async function registerOwner(slug: string) {
  return request(app)
    .post('/api/v1/auth/register')
    .send({
      businessName: 'Full Cafe',
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

describe('Remaining modules', () => {
  it('covers kitchen, reservations, customers, promotions, qr, notifications, billing, and public menu', async () => {
    const slug = `full-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Food' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Sandwich',
        price: '12.00',
      });

    const table = await request(app)
      .post('/api/v1/floor-plan/tables')
      .set('Authorization', `Bearer ${token}`)
      .send({ tableIdentifier: 'T10', layoutX: 0, layoutY: 0, capacity: 4 });

    const customer = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Jane Doe', email: 'jane@example.com' });

    expect(customer.status).toBe(201);

    const reservationTime = new Date();
    reservationTime.setDate(reservationTime.getDate() + 1);
    reservationTime.setHours(18, 0, 0, 0);

    const reservation = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tableId: table.body.data.table.id,
        customerId: customer.body.data.customer.id,
        customerName: 'Jane Doe',
        customerContact: 'jane@example.com',
        partySize: 2,
        reservationTime: reservationTime.toISOString(),
      });

    expect(reservation.status).toBe(201);

    const confirmed = await request(app)
      .patch(`/api/v1/reservations/${reservation.body.data.reservation.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });

    expect(confirmed.status).toBe(200);

    const availability = await request(app)
      .get(`/api/v1/reservations/availability?date=${reservationTime.toISOString()}&partySize=2`)
      .set('Authorization', `Bearer ${token}`);

    expect(availability.status).toBe(200);
    expect(Array.isArray(availability.body.data.slots)).toBe(true);

    const order = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        tableId: table.body.data.table.id,
        customerId: customer.body.data.customer.id,
        items: [{ menuItemId: item.body.data.item.id, quantity: 1 }],
      });

    expect(order.status).toBe(201);

    const kitchen = await request(app)
      .get('/api/v1/kitchen/queue')
      .set('Authorization', `Bearer ${token}`);

    expect(kitchen.status).toBe(200);
    expect(kitchen.body.data.orders.length).toBeGreaterThan(0);

    const promotion = await request(app)
      .post('/api/v1/promotions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Happy Hour',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(promotion.status).toBe(201);

    const activated = await request(app)
      .patch(`/api/v1/promotions/${promotion.body.data.promotion.id}/activate`)
      .set('Authorization', `Bearer ${token}`);

    expect(activated.status).toBe(200);

    const broadcast = await request(app)
      .post(`/api/v1/promotions/${promotion.body.data.promotion.id}/broadcast`)
      .set('Authorization', `Bearer ${token}`);

    expect(broadcast.status).toBe(200);

    const counterQr = await request(app)
      .get('/api/v1/qr/counter')
      .set('Authorization', `Bearer ${token}`);

    expect(counterQr.status).toBe(200);
    expect(counterQr.body.data.qr.url).toContain(slug);

    const tableQr = await request(app)
      .get(`/api/v1/qr/tables/${table.body.data.table.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(tableQr.status).toBe(200);

    const publicMenu = await request(app).get(`/api/v1/public/${slug}`);
    expect(publicMenu.status).toBe(200);
    expect(publicMenu.body.data.menu.length).toBeGreaterThan(0);

    const logs = await request(app)
      .get('/api/v1/notifications/logs')
      .set('Authorization', `Bearer ${token}`);

    expect(logs.status).toBe(200);
    expect(logs.body.data.logs.length).toBeGreaterThan(0);

    const subscription = await request(app)
      .get('/api/v1/billing/subscription')
      .set('Authorization', `Bearer ${token}`);

    expect(subscription.status).toBe(200);
    expect(subscription.body.data.subscription.subscriptionStatus).toBe('TRIAL');

    await request(app)
      .patch(`/api/v1/orders/${order.body.data.order.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PREPARING' });

    await request(app)
      .patch(`/api/v1/orders/${order.body.data.order.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'READY' });

    await request(app)
      .patch(`/api/v1/orders/${order.body.data.order.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' });

    const loyalty = await request(app)
      .get(`/api/v1/customers/${customer.body.data.customer.id}/loyalty/history`)
      .set('Authorization', `Bearer ${token}`);

    expect(loyalty.status).toBe(200);
    expect(loyalty.body.data.transactions.length).toBeGreaterThan(0);
  });
});
