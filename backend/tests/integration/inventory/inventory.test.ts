import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase, testPrisma } from '../../setup/test-database';
import { openBusinessDay } from '../../setup/open-business-day';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

async function registerOwner(slug: string) {
  return request(app)
    .post('/api/v1/auth/register')
    .send({
      businessName: 'Inventory Cafe',
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

describe('Inventory module', () => {
  it('creates inventory item and deducts on order completion', async () => {
    const slug = `inv-simple-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);

    const inv = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Coca Cola 500ml', unit: 'PIECE', currentQuantity: 5 });

    expect(inv.status).toBe(201);
    const inventoryItemId = inv.body.data.item.id;

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Drinks' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Coca Cola',
        price: '2.00',
      });

    const itemId = item.body.data.item.id;

    await request(app)
      .put(`/api/v1/menu/items/${itemId}/inventory`)
      .set('Authorization', `Bearer ${token}`)
      .send({ trackingMode: 'SIMPLE_STOCK', inventoryItemId });

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'TAKEAWAY',
        items: [{ menuItemId: itemId, quantity: 2 }],
      });

    expect(create.status).toBe(201);
    const orderId = create.body.data.order.id;

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'READY' });

    const completed = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED', paymentMethod: 'CASH' });

    expect(completed.status).toBe(200);

    const stock = await request(app)
      .get(`/api/v1/inventory/items/${inventoryItemId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(stock.body.data.item.currentQuantity).toBe('3');
  });

  it('rejects order when simple stock insufficient', async () => {
    const slug = `inv-oos-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);

    const inv = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Limited Item', unit: 'PIECE', currentQuantity: 1 });

    const inventoryItemId = inv.body.data.item.id;

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Snacks' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Chips',
        price: '1.00',
      });

    const itemId = item.body.data.item.id;

    await request(app)
      .put(`/api/v1/menu/items/${itemId}/inventory`)
      .set('Authorization', `Bearer ${token}`)
      .send({ trackingMode: 'SIMPLE_STOCK', inventoryItemId });

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'TAKEAWAY',
        items: [{ menuItemId: itemId, quantity: 3 }],
      });

    expect(create.status).toBe(400);
    expect(create.body.error.code).toBe('INSUFFICIENT_INVENTORY');
  });

  it('deducts recipe ingredients for variant sale', async () => {
    const slug = `inv-recipe-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;
    await openBusinessDay(app, token);

    const flour = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Flour', unit: 'G', currentQuantity: 1000 });

    const cheese = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cheese', unit: 'G', currentQuantity: 500 });

    const flourId = flour.body.data.item.id;
    const cheeseId = cheese.body.data.item.id;

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pizza' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Chicken Pizza',
        price: '10.00',
      });

    const itemId = item.body.data.item.id;

    const variant = await request(app)
      .post(`/api/v1/menu/items/${itemId}/variants`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Large', price: '12.00' });

    const variantId = variant.body.data.variant.id;

    await request(app)
      .put(`/api/v1/menu/variants/${variantId}/inventory`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        trackingMode: 'RECIPE',
        recipeLines: [
          { inventoryItemId: flourId, quantity: 250, unit: 'G' },
          { inventoryItemId: cheeseId, quantity: 150, unit: 'G' },
        ],
      });

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        orderType: 'TAKEAWAY',
        items: [{ menuItemId: itemId, variantId, quantity: 1 }],
      });

    expect(create.status).toBe(201);
    const orderId = create.body.data.order.id;

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'READY' });

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED', paymentMethod: 'CASH' });

    const flourStock = await testPrisma.inventoryItem.findUnique({ where: { id: flourId } });
    const cheeseStock = await testPrisma.inventoryItem.findUnique({ where: { id: cheeseId } });

    expect(Number(flourStock?.currentQuantity)).toBe(750);
    expect(Number(cheeseStock?.currentQuantity)).toBe(350);
  });
});
