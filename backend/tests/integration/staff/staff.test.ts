import request from 'supertest';
import { createApp } from '../../../src/app';
import { disconnectTestDatabase } from '../../setup/test-database';

const app = createApp();

afterAll(async () => {
  await disconnectTestDatabase();
});

async function registerOwner(slug: string, email: string) {
  return request(app)
    .post('/api/v1/auth/register')
    .send({
      businessName: 'Staff Cafe',
      businessSlug: slug,
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: 'Owner',
      email,
      password: 'password123',
    });
}

describe('Staff module', () => {
  it('creates and lists staff members', async () => {
    const register = await registerOwner('staff-cafe', 'owner@staff.com');
    const token = register.body.data.accessToken;

    const create = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'John Employee',
        email: 'john@staff.com',
        password: 'password123',
        roleName: 'employee',
      });

    expect(create.status).toBe(201);
    expect(create.body.data.staff.roles).toContain('employee');

    const list = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.data.staff).toHaveLength(2);
  });

  it('updates staff role', async () => {
    const register = await registerOwner('role-cafe', 'owner@role.com');
    const token = register.body.data.accessToken;

    const create = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jane Manager',
        email: 'jane@role.com',
        password: 'password123',
        roleName: 'employee',
      });

    const staffId = create.body.data.staff.id;

    const update = await request(app)
      .patch(`/api/v1/staff/${staffId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleName: 'manager' });

    expect(update.status).toBe(200);
    expect(update.body.data.staff.roles).toContain('manager');
  });

  it('updates staff name and password', async () => {
    const register = await registerOwner('edit-cafe', 'owner@edit.com');
    const token = register.body.data.accessToken;

    const create = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Edit Me',
        email: 'edit@staff.com',
        password: 'password123',
        roleName: 'employee',
      });

    const staffId = create.body.data.staff.id;

    const update = await request(app)
      .patch(`/api/v1/staff/${staffId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name', password: 'newpassword123' });

    expect(update.status).toBe(200);
    expect(update.body.data.staff.name).toBe('Updated Name');
  });

  it('deletes staff member', async () => {
    const register = await registerOwner('delete-cafe', 'owner@delete.com');
    const token = register.body.data.accessToken;

    const create = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Delete Me',
        email: 'delete@staff.com',
        password: 'password123',
        roleName: 'employee',
      });

    const staffId = create.body.data.staff.id;

    const del = await request(app)
      .delete(`/api/v1/staff/${staffId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(del.status).toBe(200);
    expect(del.body.data.deleted).toBe(true);

    const list = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.staff).toHaveLength(1);
  });

  it('deactivates staff member', async () => {
    const register = await registerOwner('deact-cafe', 'owner@deact.com');
    const token = register.body.data.accessToken;

    const create = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Temp Employee',
        email: 'temp@deact.com',
        password: 'password123',
        roleName: 'employee',
      });

    const staffId = create.body.data.staff.id;

    const deactivate = await request(app)
      .patch(`/api/v1/staff/${staffId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });

    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.staff.isActive).toBe(false);
  });
});
