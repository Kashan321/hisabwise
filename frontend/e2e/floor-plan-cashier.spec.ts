import { test, expect } from '@playwright/test';

/**
 * Floor plan cashier flows (FP-01 – FP-06).
 * Requires auth storage state and seeded tables — extend with tenant fixtures.
 */
test.describe('Floor plan cashier', () => {
  test.skip(!process.env.E2E_TENANT_SLUG, 'Set E2E_TENANT_SLUG to run floor plan e2e');

  const slug = process.env.E2E_TENANT_SLUG!;

  test('FP-01: free table opens new order with dine-in preset', async ({ page }) => {
    await page.goto(`/${slug}/floor-plan`);
    await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible();
    const freeCard = page.locator('button').filter({ hasText: 'Free' }).first();
    await freeCard.click();
    await expect(page).toHaveURL(new RegExp(`/orders/new\\?tableId=`));
    await expect(page.getByText('Dine In', { exact: false })).toBeVisible();
  });

  test('FP-06: free table blocked when unpaid bill exists', async ({ page }) => {
    await page.goto(`/${slug}/floor-plan`);
    const busyCard = page.locator('button').filter({ hasText: 'Busy' }).first();
    test.skip(!(await busyCard.isVisible()), 'No busy table in seed data');
    await busyCard.click();
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('button', { name: 'Free table' }).click();
    await page.getByRole('button', { name: 'Free table' }).last().click();
    await expect(page.getByText(/unpaid bill/i)).toBeVisible();
  });
});
