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
      businessName: 'Business Day Cafe',
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

async function closeShift(token: string, shiftId: string) {
  const accounts = await request(app)
    .get('/api/v1/cash-shifts/settlement-accounts')
    .set('Authorization', `Bearer ${token}`);

  const accountId = accounts.body.data.accounts[0].id as string;

  return request(app)
    .post(`/api/v1/cash-shifts/${shiftId}/close`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      actualCash: 10,
      closingSettlement: 'KEEP_IN_DRAWER',
      transferredCash: 10,
      destinationAccountId: accountId,
    });
}

describe('Business day lifecycle', () => {
  it('requires an open business day before opening a cash shift', async () => {
    const slug = `bd-shift-gate-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;

    const shiftAttempt = await request(app)
      .post('/api/v1/cash-shifts/open')
      .set('Authorization', `Bearer ${token}`)
      .send({ openingCash: 0 });

    expect(shiftAttempt.status).toBeGreaterThanOrEqual(400);
  });

  it('keeps order sequence across shift close and blocks closing day with open shifts', async () => {
    const slug = `bd-seq-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;

    const day = await openBusinessDay(app, token);

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

    const shift = await request(app)
      .post('/api/v1/cash-shifts/open')
      .set('Authorization', `Bearer ${token}`)
      .send({ openingCash: 0 });

    expect(shift.status).toBe(201);

    const firstOrder = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        items: [{ menuItemId: item.body.data.item.id, quantity: 1 }],
      });

    expect(firstOrder.status).toBe(201);
    expect(firstOrder.body.data.order.ticketNumber).toBe(1);
    expect(firstOrder.body.data.order.businessDayId).toBe(day.id);

    const closeShiftRes = await closeShift(token, shift.body.data.shift.id);
    expect(closeShiftRes.status).toBe(200);

    const secondOrder = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'STAFF_ASSISTED',
        items: [{ menuItemId: item.body.data.item.id, quantity: 1 }],
      });

    expect(secondOrder.status).toBe(201);
    expect(secondOrder.body.data.order.ticketNumber).toBe(2);

    const reopenShift = await request(app)
      .post('/api/v1/cash-shifts/open')
      .set('Authorization', `Bearer ${token}`)
      .send({ openingCash: 0 });

    expect(reopenShift.status).toBe(201);

    const closeDayBlocked = await request(app)
      .post(`/api/v1/business-days/${day.id}/close`)
      .set('Authorization', `Bearer ${token}`);

    expect(closeDayBlocked.status).toBeGreaterThanOrEqual(400);

    const closeShiftAgain = await closeShift(token, reopenShift.body.data.shift.id);
    expect(closeShiftAgain.status).toBe(200);

    const closeDay = await request(app)
      .post(`/api/v1/business-days/${day.id}/close`)
      .set('Authorization', `Bearer ${token}`);

    expect(closeDay.status).toBe(200);
    expect(closeDay.body.data.businessDay.status).toBe('CLOSED');
  });

  it('reopens the same business date after an early close', async () => {
    const slug = `bd-reopen-${Date.now()}`;
    const register = await registerOwner(slug);
    const token = register.body.data.accessToken;

    const day = await openBusinessDay(app, token);

    const closeDay = await request(app)
      .post(`/api/v1/business-days/${day.id}/close`)
      .set('Authorization', `Bearer ${token}`);

    expect(closeDay.status).toBe(200);

    const reopened = await openBusinessDay(app, token);

    expect(reopened.id).toBe(day.id);
    expect(reopened.status).toBe('OPEN');
    expect(reopened.businessDate).toBe(day.businessDate);
    expect(reopened.openCount).toBe(2);
    expect(reopened.closeCount).toBe(1);
  });
});
