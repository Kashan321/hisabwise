import type { Express } from 'express';
import request from 'supertest';

export async function openBusinessDay(app: Express, token: string) {
  const response = await request(app)
    .post('/api/v1/business-days/open')
    .set('Authorization', `Bearer ${token}`);

  if (response.status !== 201) {
    throw new Error(
      `Failed to open business day: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.data.businessDay as {
    id: string;
    businessDate: string;
    status: 'OPEN' | 'CLOSED';
  };
}
