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
      businessName: 'Order Cafe',
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

describe('Orders module', () => {
  it('creates an order with pricing and updates status', async () => {
    const slug = `orders-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Drinks' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Latte',
        price: '5.00',
      });

    const table = await request(app)
      .post('/api/v1/floor-plan/tables')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tableIdentifier: 'T1',
        layoutX: 10,
        layoutY: 20,
      });

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        tableId: table.body.data.table.id,
        items: [{ menuItemId: item.body.data.item.id, quantity: 2 }],
      });

    expect(create.status).toBe(201);
    expect(create.body.data.order.status).toBe('RECEIVED');
    expect(create.body.data.order.subtotal).toBe('10.00');
    expect(create.body.data.order.totalAmount).toBe('10.80');
    expect(create.body.data.order.source).toBe('STAFF_ASSISTED');

    const orderId = create.body.data.order.id;

    const preparing = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PREPARING' });

    expect(preparing.status).toBe(200);
    expect(preparing.body.data.order.status).toBe('PREPARING');

    const list = await request(app)
      .get('/api/v1/orders?status=PREPARING')
      .set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.data.orders).toHaveLength(1);
    expect(list.body.data.meta.total).toBe(1);

    const ready = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'READY' });

    expect(ready.status).toBe(200);
    expect(ready.body.data.order.status).toBe('READY');

    const completeWithoutPayment = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' });

    expect(completeWithoutPayment.status).toBe(400);

    const completed = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED', paymentMethod: 'CASH' });

    expect(completed.status).toBe(200);
    expect(completed.body.data.order.status).toBe('COMPLETED');
    expect(completed.body.data.order.paymentMethod).toBe('CASH');

    const filters = await request(app)
      .get('/api/v1/orders/filters')
      .set('Authorization', `Bearer ${token}`);

    expect(filters.status).toBe(200);
    expect(filters.body.data.filters.sources).toHaveLength(3);
    expect(filters.body.data.filters.tables).toHaveLength(1);
    expect(filters.body.data.filters.paymentMethods).toHaveLength(4);

    const byTable = await request(app)
      .get('/api/v1/orders?tableIdentifier=T1&statusGroup=active')
      .set('Authorization', `Bearer ${token}`);

    expect(byTable.status).toBe(200);
    expect(byTable.body.data.orders).toHaveLength(0);

    const completedList = await request(app)
      .get('/api/v1/orders?statusGroup=completed')
      .set('Authorization', `Bearer ${token}`);

    expect(completedList.status).toBe(200);
    expect(completedList.body.data.orders).toHaveLength(1);
    expect(completedList.body.data.orders[0].paymentMethod).toBe('CASH');

    const bySource = await request(app)
      .get('/api/v1/orders?source=STAFF_ASSISTED&statusGroup=all')
      .set('Authorization', `Bearer ${token}`);

    expect(bySource.status).toBe(200);
    expect(bySource.body.data.orders).toHaveLength(1);
  });

  it('applies an active promotion discount to order totals', async () => {
    const slug = `promo-order-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Drinks' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Latte',
        price: '5.00',
      });

    const promotion = await request(app)
      .post('/api/v1/promotions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Ten Off',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        startDate: new Date(Date.now() - 86_400_000).toISOString(),
        endDate: new Date(Date.now() + 86_400_000).toISOString(),
      });

    await request(app)
      .patch(`/api/v1/promotions/${promotion.body.data.promotion.id}/activate`)
      .set('Authorization', `Bearer ${token}`);

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        promotionId: promotion.body.data.promotion.id,
        items: [{ menuItemId: item.body.data.item.id, quantity: 2 }],
      });

    expect(create.status).toBe(201);
    expect(create.body.data.order.subtotal).toBe('10.00');
    expect(create.body.data.order.discountAmount).toBe('1.00');
    expect(create.body.data.order.taxAmount).toBe('0.72');
    expect(create.body.data.order.totalAmount).toBe('9.72');
    expect(create.body.data.order.promotionTitle).toBe('Ten Off');
  });
});
