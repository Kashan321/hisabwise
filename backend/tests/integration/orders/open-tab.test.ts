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
      businessName: 'Open Tab Cafe',
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

async function seedMenuAndTable(token: string) {
  const category = await request(app)
    .post('/api/v1/menu/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Mains' });

  const pizza = await request(app)
    .post('/api/v1/menu/items')
    .set('Authorization', `Bearer ${token}`)
    .send({
      categoryId: category.body.data.category.id,
      name: 'Pizza',
      price: '12.00',
    });

  const drink = await request(app)
    .post('/api/v1/menu/items')
    .set('Authorization', `Bearer ${token}`)
    .send({
      categoryId: category.body.data.category.id,
      name: 'Cola',
      price: '3.00',
    });

  const table = await request(app)
    .post('/api/v1/floor-plan/tables')
    .set('Authorization', `Bearer ${token}`)
    .send({
      tableIdentifier: 'T1',
      layoutX: 10,
      layoutY: 20,
    });

  return {
    pizzaId: pizza.body.data.item.id as string,
    drinkId: drink.body.data.item.id as string,
    tableId: table.body.data.table.id as string,
  };
}

describe('Open tab orders (dine-in + takeaway)', () => {
  it('allows adding items to a live dine-in order', async () => {
    const slug = `open-tab-dine-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);
    const { pizzaId, drinkId, tableId } = await seedMenuAndTable(token);

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'DINE_IN',
        tableId,
        isDraft: false,
        items: [{ menuItemId: pizzaId, quantity: 1 }],
      });

    expect(create.status).toBe(201);
    expect(create.body.data.order.isDraft).toBe(false);
    const orderId = create.body.data.order.id;
    const initialTotal = Number(create.body.data.order.totalAmount);

    const add = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItemId: drinkId, quantity: 1 }],
      });

    expect(add.status).toBe(200);
    expect(Number(add.body.data.order.totalAmount)).toBeGreaterThan(initialTotal);
    expect(add.body.data.order.items).toHaveLength(2);
  });

  it('allows adding items while order is PREPARING', async () => {
    const slug = `open-tab-prep-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);
    const { pizzaId, drinkId, tableId } = await seedMenuAndTable(token);

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'TAKEAWAY',
        tableId,
        isDraft: false,
        items: [{ menuItemId: pizzaId, quantity: 1 }],
      });

    const orderId = create.body.data.order.id;

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PREPARING' });

    const add = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItemId: drinkId, quantity: 1 }],
      });

    expect(add.status).toBe(200);
    expect(add.body.data.order.items).toHaveLength(2);
  });

  it('rejects adding items to completed orders', async () => {
    const slug = `open-tab-done-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);
    const { pizzaId, drinkId, tableId } = await seedMenuAndTable(token);

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'DINE_IN',
        tableId,
        isDraft: false,
        items: [{ menuItemId: pizzaId, quantity: 1 }],
      });

    const orderId = create.body.data.order.id;

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED', paymentMethod: 'CASH' });

    const add = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItemId: drinkId, quantity: 1 }],
      });

    expect(add.status).toBe(400);
    expect(add.body.error.code).toBe('ORDER_NOT_MODIFIABLE');
  });

  it('rejects adding items to delivery orders', async () => {
    const slug = `open-tab-delivery-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    const { pizzaId, drinkId } = await seedMenuAndTable(token);

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'DELIVERY',
        isDraft: false,
        customerName: 'Ali',
        customerPhone: '03001234567',
        deliveryAddress: '123 Main St',
        items: [{ menuItemId: pizzaId, quantity: 1 }],
      });

    const orderId = create.body.data.order.id;

    const add = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItemId: drinkId, quantity: 1 }],
      });

    expect(add.status).toBe(400);
    expect(add.body.error.code).toBe('ORDER_NOT_MODIFIABLE');
  });
});
