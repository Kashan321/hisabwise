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
      businessName: 'Waiter Rider Cafe',
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

async function createStaffWithRole(
  ownerToken: string,
  roleName: 'waiter' | 'rider',
  email: string,
) {
  await request(app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: `${roleName} user`,
      email,
      password: 'password123',
      roleName,
    });

  const login = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'password123',
  });

  return {
    staffId: login.body.data.user.id as string,
    token: login.body.data.accessToken as string,
  };
}

describe('Waiter & Rider module', () => {
  it('supports waiter draft orders, send to kitchen, and table assignment', async () => {
    const slug = `waiter-${Date.now()}`;
    const register = await registerOwner(slug);
    const ownerToken = register.body.data.accessToken;
    await openBusinessDay(app, ownerToken);

    const waiter = await createStaffWithRole(
      ownerToken,
      'waiter',
      `waiter@${slug}.com`,
    );

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Mains' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Burger',
        price: '12.00',
      });

    const table = await request(app)
      .post('/api/v1/floor-plan/tables')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tableIdentifier: 'W1',
        layoutX: 10,
        layoutY: 20,
      });

    await request(app)
      .post(`/api/v1/waiter/tables/${table.body.data.table.id}/assign`)
      .set('Authorization', `Bearer ${waiter.token}`)
      .send({ waiterId: waiter.staffId });

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${waiter.token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'DINE_IN',
        tableId: table.body.data.table.id,
        items: [{ menuItemId: item.body.data.item.id, quantity: 1 }],
      });

    expect(create.status).toBe(201);
    expect(create.body.data.order.isDraft).toBe(true);
    expect(create.body.data.order.waiterId).toBe(waiter.staffId);

    const orderId = create.body.data.order.id;

    const kitchenBefore = await request(app)
      .get('/api/v1/kitchen/queue')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(kitchenBefore.body.data.orders).toHaveLength(0);

    const send = await request(app)
      .post(`/api/v1/orders/${orderId}/send-to-kitchen`)
      .set('Authorization', `Bearer ${waiter.token}`);

    expect(send.status).toBe(200);
    expect(send.body.data.order.isDraft).toBe(false);
    expect(send.body.data.order.sentToKitchenAt).toBeTruthy();

    const dashboard = await request(app)
      .get('/api/v1/waiter/dashboard')
      .set('Authorization', `Bearer ${waiter.token}`);

    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.dashboard.myOrders.length).toBeGreaterThanOrEqual(1);
    expect(dashboard.body.data.dashboard.assignedTables).toHaveLength(1);
  });

  it('supports delivery assignment and rider status updates', async () => {
    const slug = `delivery-${Date.now()}`;
    const register = await registerOwner(slug);
    const ownerToken = register.body.data.accessToken;
    await openBusinessDay(app, ownerToken);

    const rider = await createStaffWithRole(
      ownerToken,
      'rider',
      `rider@${slug}.com`,
    );

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Mains' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Pizza',
        price: '15.00',
      });

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        source: 'ONLINE_DELIVERY',
        orderType: 'DELIVERY',
        customerName: 'Alex Customer',
        customerPhone: '+15551234567',
        deliveryAddress: '123 Main St',
        items: [{ menuItemId: item.body.data.item.id, quantity: 1 }],
      });

    expect(create.status).toBe(201);
    const orderId = create.body.data.order.id;

    const assign = await request(app)
      .post(`/api/v1/delivery/orders/${orderId}/assign-rider`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ riderId: rider.staffId });

    expect(assign.status).toBe(200);
    expect(assign.body.data.order.riderId).toBe(rider.staffId);
    expect(assign.body.data.order.deliveryStatus).toBe('ASSIGNED');

    const pickedUp = await request(app)
      .patch(`/api/v1/rider/deliveries/${orderId}/status`)
      .set('Authorization', `Bearer ${rider.token}`)
      .send({ deliveryStatus: 'PICKED_UP' });

    expect(pickedUp.status).toBe(200);
    expect(pickedUp.body.data.order.deliveryStatus).toBe('PICKED_UP');

    const riderDashboard = await request(app)
      .get('/api/v1/rider/dashboard')
      .set('Authorization', `Bearer ${rider.token}`);

    expect(riderDashboard.status).toBe(200);
    expect(riderDashboard.body.data.dashboard.stats.total).toBeGreaterThanOrEqual(1);
  });

  it('records tenant audit logs for waiter actions', async () => {
    const slug = `audit-${Date.now()}`;
    const register = await registerOwner(slug);
    const ownerToken = register.body.data.accessToken;
    await openBusinessDay(app, ownerToken);

    const waiter = await createStaffWithRole(
      ownerToken,
      'waiter',
      `audit-waiter@${slug}.com`,
    );

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Drinks' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Tea',
        price: '3.00',
      });

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${waiter.token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'TAKEAWAY',
        items: [{ menuItemId: item.body.data.item.id, quantity: 1 }],
      });

    const orderId = create.body.data.order.id;

    await request(app)
      .post(`/api/v1/orders/${orderId}/send-to-kitchen`)
      .set('Authorization', `Bearer ${waiter.token}`);

    const logs = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(logs.status).toBe(200);
    expect(logs.body.data.logs.length).toBeGreaterThan(0);
    expect(logs.body.data.logs.some((log: { action: string }) => log.action === 'order.sent_to_kitchen')).toBe(
      true,
    );
  });

  it('enforces tenant isolation for waiter orders', async () => {
    const slugA = `iso-a-${Date.now()}`;
    const slugB = `iso-b-${Date.now()}`;

    const ownerA = await registerOwner(slugA);
    const ownerB = await registerOwner(slugB);
    await openBusinessDay(app, ownerA.body.data.accessToken);

    const waiterA = await createStaffWithRole(
      ownerA.body.data.accessToken,
      'waiter',
      `waiter-a@${slugA}.com`,
    );

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${ownerA.body.data.accessToken}`)
      .send({ name: 'Food' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${ownerA.body.data.accessToken}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Soup',
        price: '6.00',
      });

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${waiterA.token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'DINE_IN',
        items: [{ menuItemId: item.body.data.item.id, quantity: 1 }],
      });

    const orderId = create.body.data.order.id;

    const crossTenant = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${ownerB.body.data.accessToken}`);

    expect(crossTenant.status).toBe(404);
  });
});
