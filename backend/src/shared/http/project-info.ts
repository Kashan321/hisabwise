import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiServiceName, APP_TAGLINE, postmanCollectionPath } from '../../config/branding';
import { env } from '../../config/env';

export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../../package.json'), 'utf-8'),
) as { version: string };

const APP_VERSION = packageJson.version;

const MODULES = [
  { name: 'Auth', path: `${API_BASE_PATH}/auth`, description: 'Registration, login, sessions' },
  { name: 'Business', path: `${API_BASE_PATH}/business`, description: 'Tenant profile and branding' },
  { name: 'Staff', path: `${API_BASE_PATH}/staff`, description: 'Staff accounts and roles' },
  { name: 'Menu', path: `${API_BASE_PATH}/menu`, description: 'Categories, items, modifiers' },
  { name: 'Floor Plan', path: `${API_BASE_PATH}/floor-plan`, description: 'Table layout and status' },
  { name: 'Orders', path: `${API_BASE_PATH}/orders`, description: 'Ordering and checkout' },
  { name: 'Kitchen', path: `${API_BASE_PATH}/kitchen`, description: 'Kitchen display queue' },
  { name: 'Reservations', path: `${API_BASE_PATH}/reservations`, description: 'Table bookings' },
  { name: 'Customers', path: `${API_BASE_PATH}/customers`, description: 'Customer profiles and loyalty' },
  { name: 'Promotions', path: `${API_BASE_PATH}/promotions`, description: 'Campaigns and discounts' },
  { name: 'QR', path: `${API_BASE_PATH}/qr`, description: 'QR code URLs for ordering' },
  { name: 'Public', path: `${API_BASE_PATH}/public`, description: 'Public menu and table resolve' },
  {
    name: 'Notifications',
    path: `${API_BASE_PATH}/notifications`,
    description: 'Inbox, preferences, and delivery logs',
  },
  { name: 'Billing', path: `${API_BASE_PATH}/billing`, description: 'Subscription status' },
  { name: 'Platform', path: `${API_BASE_PATH}/platform`, description: 'SaaS platform admin and super admin' },
] as const;

export function buildProjectInfo() {
  return {
    service: apiServiceName(),
    tagline: APP_TAGLINE,
    version: APP_VERSION,
    apiVersion: API_VERSION,
    environment: env.NODE_ENV,
    status: 'operational',
    architecture: 'modular monolith',
    timestamp: new Date().toISOString(),
    links: {
      root: '/',
      apiRoot: API_BASE_PATH,
      health: `${API_BASE_PATH}/health`,
      documentation: `Import ${postmanCollectionPath()}`,
    },
    modules: MODULES,
    capabilities: {
      notificationInbox: true,
    },
  };
}
