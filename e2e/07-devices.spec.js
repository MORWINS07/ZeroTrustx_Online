import { test, expect } from '@playwright/test';

test.describe('07 - Device Inventory & Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('deviceId', 'admin-trusted-device'));
    await page.reload();

    await page.fill('[data-testid="login-email"]', 'admin@zerotrustx.local');
    await page.fill('[data-testid="login-password"]', 'AdminPass@123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display device inventory and open enrollment modal', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('h1')).toHaveText('Trusted Devices');

    // Devices table
    await expect(page.locator('[data-testid="devices-table"]')).toBeVisible();

    // Click register device
    await page.click('[data-testid="register-device-btn"]');
    await expect(page.locator('.modal-title')).toHaveText('Enroll New Device');
    await expect(page.locator('[data-testid="device-name-input"]')).toBeVisible();

    // Fill form and submit
    await page.fill('[data-testid="device-name-input"]', 'QA Test Tablet');
    await page.selectOption('[data-testid="device-type-select"]', 'TABLET');
    await page.click('[data-testid="submit-device-registration"]');

    // Should appear in table
    await expect(page.locator('text=QA Test Tablet')).toBeVisible();
  });
});
