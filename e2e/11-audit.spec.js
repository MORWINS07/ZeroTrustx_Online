import { test, expect } from '@playwright/test';

test.describe('11 - Immutable Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('deviceId', 'admin-trusted-device'));
    await page.reload();

    await page.fill('[data-testid="login-email"]', 'admin@zerotrustx.local');
    await page.fill('[data-testid="login-password"]', 'AdminPass@123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display audit events table, category filter, and modal evidence inspection', async ({ page }) => {
    await page.goto('/audit-logs');
    await expect(page.locator('h1')).toHaveText('Security Audit Trail');

    // Audit table
    await expect(page.locator('[data-testid="audit-table"]')).toBeVisible();

    // Category filter
    const filter = page.locator('[data-testid="audit-category-filter"]');
    await expect(filter).toBeVisible();

    // Inspect first event evidence if available
    const inspectBtn = page.locator('text=Inspect').first();
    if (await inspectBtn.isVisible()) {
      await inspectBtn.click();
      await expect(page.locator('.modal-title')).toHaveText('Audit Evidence Inspection');
      await expect(page.locator('text=RAW CONTEXTUAL METADATA')).toBeVisible();
      await page.click('text=Close Inspection');
    }
  });
});
