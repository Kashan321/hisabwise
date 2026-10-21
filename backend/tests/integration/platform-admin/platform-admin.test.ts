import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase, testPrisma } from '../../setup/test-database';

const app = createApp();
const API = '/api/v1';

async function loginSuperAdmin() {
  const response = await request(app).post(`${API}/platform/auth/login`).send({
    email: 'super@venta.test',
    password: 'password123',
  });

  return {
    token: response.body.data.accessToken as string,
    user: response.body.data.user,
  };
}

async function registerTenant(slug: string) {
  await request(app).post(`${API}/auth/register`).send({
    businessName: `Cafe ${slug}`,
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

afterAll(async () => {
  await disconnectTestDatabase();
});

describe('Platform admin', () => {
  it('super admin can log in and fetch profile', async () => {
    const login = await loginSuperAdmin();

    expect(login.user.role).toBe('SUPER_ADMIN');
    expect(login.user.permissions).toContain('*');

    const me = await request(app)
      .get(`${API}/platform/auth/me`)
      .set('Authorization', `Bearer ${login.token}`);

    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('super@venta.test');
  });

  it('super admin can list businesses and metrics', async () => {
    await registerTenant('alpha-cafe');
    await registerTenant('beta-cafe');
    const { token } = await loginSuperAdmin();

    const businesses = await request(app)
      .get(`${API}/platform/businesses`)
      .set('Authorization', `Bearer ${token}`);

    expect(businesses.status).toBe(200);
    expect(businesses.body.data.businesses.length).toBeGreaterThanOrEqual(2);

    const metrics = await request(app)
      .get(`${API}/platform/metrics`)
      .set('Authorization', `Bearer ${token}`);

    expect(metrics.status).toBe(200);
    expect(metrics.body.data.metrics.totalBusinesses).toBeGreaterThanOrEqual(2);
  });

  it('super admin can suspend and reactivate a business', async () => {
    await registerTenant('suspend-cafe');
    const { token } = await loginSuperAdmin();

    const listed = await request(app)
      .get(`${API}/platform/businesses`)
      .set('Authorization', `Bearer ${token}`);
    const business = listed.body.data.businesses.find(
      (item: { slug: string }) => item.slug === 'suspend-cafe',
    );

    const suspended = await request(app)
      .post(`${API}/platform/businesses/${business.id}/suspend`)
      .set('Authorization', `Bearer ${token}`);

    expect(suspended.status).toBe(200);
    expect(suspended.body.data.business.isSuspended).toBe(true);

    const blockedLogin = await request(app).post(`${API}/auth/login`).send({
      businessSlug: 'suspend-cafe',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'owner@suspend-cafe.com',
      password: 'password123',
    });
    expect(blockedLogin.status).toBe(403);
    expect(blockedLogin.body.error.code).toBe('BUSINESS_SUSPENDED');

    const reactivated = await request(app)
      .post(`${API}/platform/businesses/${business.id}/reactivate`)
      .set('Authorization', `Bearer ${token}`);

    expect(reactivated.status).toBe(200);
    expect(reactivated.body.data.business.isSuspended).toBe(false);
  });

  it('super admin can create a platform admin', async () => {
    const { token } = await loginSuperAdmin();

    const created = await request(app)
      .post(`${API}/platform/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Ops Admin',
        email: 'ops@venta.test',
        password: 'password123',
        role: 'PLATFORM_ADMIN',
      });

    expect(created.status).toBe(201);
    expect(created.body.data.admin.role).toBe('PLATFORM_ADMIN');
  });

  it('platform admin cannot create other platform admins', async () => {
    const { token: superToken } = await loginSuperAdmin();

    await request(app)
      .post(`${API}/platform/admins`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        name: 'Limited Admin',
        email: 'limited@venta.test',
        password: 'password123',
        role: 'PLATFORM_ADMIN',
      });

    const platformLogin = await request(app).post(`${API}/platform/auth/login`).send({
      email: 'limited@venta.test',
      password: 'password123',
    });

    const denied = await request(app)
      .post(`${API}/platform/admins`)
      .set('Authorization', `Bearer ${platformLogin.body.data.accessToken}`)
      .send({
        name: 'Another Admin',
        email: 'another@venta.test',
        password: 'password123',
        role: 'PLATFORM_ADMIN',
      });

    expect(denied.status).toBe(403);
  });

  it('platform admin cannot delete businesses', async () => {
    await registerTenant('delete-me');
    const { token: superToken } = await loginSuperAdmin();

    await request(app)
      .post(`${API}/platform/admins`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        name: 'Limited Admin 2',
        email: 'limited2@venta.test',
        password: 'password123',
        role: 'PLATFORM_ADMIN',
      });

    const listed = await request(app)
      .get(`${API}/platform/businesses`)
      .set('Authorization', `Bearer ${superToken}`);
    const business = listed.body.data.businesses.find(
      (item: { slug: string }) => item.slug === 'delete-me',
    );

    const platformLogin = await request(app).post(`${API}/platform/auth/login`).send({
      email: 'limited2@venta.test',
      password: 'password123',
    });

    const denied = await request(app)
      .delete(`${API}/platform/businesses/${business.id}`)
      .set('Authorization', `Bearer ${platformLogin.body.data.accessToken}`);

    expect(denied.status).toBe(403);
  });

  it('tenant token cannot access platform routes', async () => {
    await registerTenant('tenant-only');
    const tenantLogin = await request(app).post(`${API}/auth/login`).send({
      businessSlug: 'tenant-only',
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      email: 'owner@tenant-only.com',
      password: 'password123',
    });

    const denied = await request(app)
      .get(`${API}/platform/businesses`)
      .set('Authorization', `Bearer ${tenantLogin.body.data.accessToken}`);

    expect(denied.status).toBe(401);
  });

  it('platform token cannot access tenant menu routes', async () => {
    const { token } = await loginSuperAdmin();

    const denied = await request(app)
      .get(`${API}/menu`)
      .set('Authorization', `Bearer ${token}`);

    expect(denied.status).toBe(401);
  });

  it('writes audit logs for platform actions', async () => {
    await registerTenant('audit-cafe');
    const { token } = await loginSuperAdmin();

    const listed = await request(app)
      .get(`${API}/platform/businesses`)
      .set('Authorization', `Bearer ${token}`);
    const business = listed.body.data.businesses.find(
      (item: { slug: string }) => item.slug === 'audit-cafe',
    );

    await request(app)
      .post(`${API}/platform/businesses/${business.id}/suspend`)
      .set('Authorization', `Bearer ${token}`);

    const logs = await request(app)
      .get(`${API}/platform/metrics/audit-logs`)
      .set('Authorization', `Bearer ${token}`);

    expect(logs.status).toBe(200);
    expect(
      logs.body.data.logs.some(
        (log: { action: string; targetId: string }) =>
          log.action === 'business.suspended' && log.targetId === business.id,
      ),
    ).toBe(true);

    const dbLogs = await testPrisma.platformAuditLog.count();
    expect(dbLogs).toBeGreaterThan(0);
  });
});
