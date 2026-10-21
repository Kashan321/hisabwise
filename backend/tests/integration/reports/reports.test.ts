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
      businessName: 'Report Cafe',
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

describe('Reports module', () => {
  it('returns sales summary, payment breakdown, invoices, and export', async () => {
    const slug = `reports-${Date.now()}`;
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

    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        items: [{ menuItemId: item.body.data.item.id, quantity: 2 }],
      });

    const orderId = create.body.data.order.id;

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PREPARING' });

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'READY' });

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED', paymentMethod: 'CARD' });

    const today = new Date().toISOString().slice(0, 10);

    const summary = await request(app)
      .get(`/api/v1/reports/summary?from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${token}`);

    expect(summary.status).toBe(200);
    expect(summary.body.data.summary.orderCount).toBe(1);
    expect(summary.body.data.summary.totalRevenue).toBe('10.80');

    const breakdown = await request(app)
      .get(`/api/v1/reports/payment-breakdown?from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${token}`);

    expect(breakdown.status).toBe(200);
    expect(breakdown.body.data.breakdown).toHaveLength(1);
    expect(breakdown.body.data.breakdown[0].paymentMethod).toBe('CARD');

    const daily = await request(app)
      .get(`/api/v1/reports/daily-revenue?from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${token}`);

    expect(daily.status).toBe(200);
    expect(daily.body.data.daily).toHaveLength(1);
    expect(daily.body.data.daily[0].totalAmount).toBe('10.80');

    const invoices = await request(app)
      .get(`/api/v1/reports/invoices?from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${token}`);

    expect(invoices.status).toBe(200);
    expect(invoices.body.data.invoices).toHaveLength(1);
    expect(invoices.body.data.invoices[0].paymentMethod).toBe('CARD');
    expect(invoices.body.data.invoices[0].invoiceNumber).toMatch(/^INV-/);

    const exportCsv = await request(app)
      .get(`/api/v1/reports/invoices/export?from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${token}`);

    expect(exportCsv.status).toBe(200);
    expect(exportCsv.body.data.csv).toContain('INV-');
    expect(exportCsv.body.data.filename).toContain('invoices-');
  });
});
