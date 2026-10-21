import { test, expect } from '@playwright/test';

test.describe('06 - Enterprise Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Bind trusted admin device and login
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('deviceId', 'admin-trusted-device'));
    await page.reload();

    await page.fill('[data-testid="login-email"]', 'admin@zerotrustx.local');
    await page.fill('[data-testid="login-password"]', 'AdminPass@123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display Apple-style layout, navigation, and posture metrics', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Security Overview');
    await expect(page.locator('.sidebar-header')).toContainText('ZeroTrustX');

    // Posture cards
    await expect(page.locator('[data-testid="stat-mfa-coverage"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-trusted-devices"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-active-sessions"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-access-decisions"]')).toBeVisible();

    // Data table
    await expect(page.locator('[data-testid="dashboard-events-table"]')).toBeVisible();
  });
});
