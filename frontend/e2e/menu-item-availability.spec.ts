/**
 * Menu Editor availability toggle (requires @playwright/test and a running app).
 *
 * Run: npx playwright test e2e/menu-item-availability.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('Menu Editor availability toggle', () => {
  test.skip(true, 'Configure baseURL and auth storage, then remove skip for CI');

  test('toggles item availability from the edit drawer', async ({ page }) => {
    await page.goto('/kabab/menu');
    await page.getByRole('button', { name: /Boneless Chicken Karahi/i }).click();
    const toggle = page.getByRole('button', { name: /^Available$|^Unavailable/i });
    await toggle.click();
    await expect(page.getByText(/Marked unavailable|Marked available/)).toBeVisible();
  });
});
