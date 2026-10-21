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
      businessName: 'Menu Cafe',
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

describe('Menu module', () => {
  it('creates category, item, modifier group and returns full menu', async () => {
    const register = await registerOwner('menu-test');
    const token = register.body.data.accessToken;

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Espresso', displayOrder: 1 });

    expect(category.status).toBe(201);
    const categoryId = category.body.data.category.id;

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId,
        name: 'Latte',
        description: 'Smooth espresso with steamed milk',
        price: '4.50',
      });

    expect(item.status).toBe(201);
    const itemId = item.body.data.item.id;

    const group = await request(app)
      .post('/api/v1/menu/modifier-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Milk Type', isRequired: true, maxSelect: 1 });

    expect(group.status).toBe(201);
    const groupId = group.body.data.modifierGroup.id;

    await request(app)
      .post(`/api/v1/menu/modifier-groups/${groupId}/options`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Oat Milk', priceAdjustment: '0.50' });

    await request(app)
      .post(`/api/v1/menu/items/${itemId}/modifier-groups`)
      .set('Authorization', `Bearer ${token}`)
      .send({ modifierGroupId: groupId });

    const menu = await request(app)
      .get('/api/v1/menu')
      .set('Authorization', `Bearer ${token}`);

    expect(menu.status).toBe(200);
    expect(menu.body.data.menu).toHaveLength(1);
    expect(menu.body.data.menu[0].items[0].name).toBe('Latte');
    expect(menu.body.data.menu[0].items[0].modifierGroups[0].options).toHaveLength(1);
  });

  it('toggles item availability', async () => {
    const register = await registerOwner('menu-toggle');
    const token = register.body.data.accessToken;

    const category = await request(app)
      .post('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bakery' });

    const item = await request(app)
      .post('/api/v1/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: category.body.data.category.id,
        name: 'Croissant',
        price: '3.00',
      });

    const updated = await request(app)
      .patch(`/api/v1/menu/items/${item.body.data.item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isAvailable: false });

    expect(updated.status).toBe(200);
    expect(updated.body.data.item.isAvailable).toBe(false);
  });
});
