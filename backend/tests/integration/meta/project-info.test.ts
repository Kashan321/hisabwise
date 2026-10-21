import request from 'supertest';
import { createApp } from '../../../src/app';
import { apiServiceName } from '../../../src/config/branding';
import { API_BASE_PATH } from '../../../src/shared/http/project-info';

const app = createApp();

describe('Service metadata routes', () => {
  it('GET / returns project info', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe(apiServiceName());
    expect(response.body.data.apiVersion).toBe('v1');
    expect(response.body.data.links.health).toBe(`${API_BASE_PATH}/health`);
    expect(response.body.data.modules.length).toBeGreaterThan(0);
  });

  it('GET /api lists available API versions', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body.data.current).toBe(API_BASE_PATH);
    expect(response.body.data.versions).toContain('v1');
  });

  it(`GET ${API_BASE_PATH} returns API info`, async () => {
    const response = await request(app).get(API_BASE_PATH);

    expect(response.status).toBe(200);
    expect(response.body.data.service).toBe(apiServiceName());
  });

  it(`GET ${API_BASE_PATH}/health returns ok`, async () => {
    const response = await request(app).get(`${API_BASE_PATH}/health`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });
});
