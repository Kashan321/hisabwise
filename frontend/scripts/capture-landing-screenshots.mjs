import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/landing');
const base = process.env.LANDING_BASE_URL ?? 'http://localhost:3000';
const slug = process.env.LANDING_SLUG ?? 'buono';
const email = process.env.LANDING_EMAIL;
const password = process.env.LANDING_PASSWORD;

const shots = [
  { name: 'dashboard.png', path: `/${slug}/dashboard`, width: 1280, height: 800 },
  { name: 'reports.png', path: `/${slug}/reports`, width: 1280, height: 800 },
  { name: 'floor-plan.png', path: `/${slug}/floor-plan`, width: 1280, height: 800 },
  { name: 'orders.png', path: `/${slug}/orders`, width: 1280, height: 800 },
  { name: 'pos.png', path: `/${slug}/orders/new`, width: 1440, height: 900 },
  { name: 'kitchen.png', path: `/${slug}/kitchen`, width: 1280, height: 800 },
];

async function maybeLogin(page) {
  if (!email || !password) return false;
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).catch(() => null);
  return !page.url().includes('/login');
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  const loggedIn = await maybeLogin(page);
  if (!loggedIn && email) {
    console.warn('Login failed — capture may show login page. Set LANDING_EMAIL and LANDING_PASSWORD.');
  } else if (!email) {
    console.warn('No LANDING_EMAIL/LANDING_PASSWORD — skipping auth, pages may redirect to login.');
  }

  for (const shot of shots) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(`${base}${shot.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const file = path.join(outDir, shot.name);
    await page.screenshot({ path: file, fullPage: false });
    console.log('saved', shot.name, '->', shot.path);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
