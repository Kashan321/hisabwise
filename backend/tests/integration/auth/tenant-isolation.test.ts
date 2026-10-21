import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase, testPrisma } from '../../setup/test-database';
import argon2 from 'argon2';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

describe('Authorization and tenant isolation', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send({
      businessName: 'Owner Cafe',
      businessSlug: 'owner-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Owner User',
      email: 'owner@cafe.com',
      password: 'password123',
    });

    const employeeRole = await testPrisma.role.findFirst({
      where: { name: 'employee', businessId: null },
    });

    const business = await testPrisma.business.findUnique({ where: { slug: 'owner-cafe' } });
    const passwordHash = await argon2.hash('password123');

    const employee = await testPrisma.user.create({
      data: {
        businessId: business!.id,
        name: 'Employee User',
        email: 'employee@cafe.com',
        passwordHash,
      },
    });

    await testPrisma.userRole.create({
      data: {
        userId: employee.id,
        roleId: employeeRole!.id,
        businessId: business!.id,
      },
    });
  });

  it('allows owner to access admin-check', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      businessSlug: 'owner-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'owner@cafe.com',
      password: 'password123',
    });

    const response = await request(app)
      .get('/api/v1/auth/admin-check')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.authorized).toBe(true);
  });

  it('blocks employee from admin-check', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      businessSlug: 'owner-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'employee@cafe.com',
      password: 'password123',
    });

    const response = await request(app)
      .get('/api/v1/auth/admin-check')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('isolates /auth/me to the authenticated user tenant', async () => {
    await request(app).post('/api/v1/auth/register').send({
      businessName: 'Other Cafe',
      businessSlug: 'other-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Other Owner',
      email: 'other@cafe.com',
      password: 'password123',
    });

    const loginA = await request(app).post('/api/v1/auth/login').send({
      businessSlug: 'owner-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'owner@cafe.com',
      password: 'password123',
    });

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginA.body.data.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.data.user.businessSlug).toBe('owner-cafe');
    expect(me.body.data.user.email).toBe('owner@cafe.com');
  });
});
