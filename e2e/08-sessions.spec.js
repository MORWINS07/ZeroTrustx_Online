import { test, expect } from '@playwright/test';

test.describe('08 - Active Sessions Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('deviceId', 'admin-trusted-device'));
    await page.reload();

    await page.fill('[data-testid="login-email"]', 'admin@zerotrustx.local');
    await page.fill('[data-testid="login-password"]', 'AdminPass@123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display active sessions table and current session badge', async ({ page }) => {
    await page.goto('/sessions');
    await expect(page.locator('h1')).toHaveText('Active Sessions');

    // Table
    await expect(page.locator('[data-testid="sessions-table"]')).toBeVisible();

    // Verify "This Device" pill
    await expect(page.locator('text=This Device')).toBeVisible();

    // Revoke all button should be present
    await expect(page.locator('[data-testid="revoke-all-sessions-btn"]')).toBeVisible();
  });
});
