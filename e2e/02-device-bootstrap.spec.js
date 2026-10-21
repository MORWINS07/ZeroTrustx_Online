import { test, expect } from '@playwright/test';

test.describe('02 - Device Bootstrap Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    name: `Device User ${timestamp}`,
    email: `devuser-${timestamp}@zerotrustx.test`,
    password: 'Password@123',
  };

  test('should complete device enrollment and route to login with verified status', async ({ page }) => {
    // 1. Register first
    await page.goto('/register');
    await page.fill('[data-testid="register-name"]', testUser.name);
    await page.fill('[data-testid="register-email"]', testUser.email);
    await page.fill('[data-testid="register-password"]', testUser.password);
    await page.fill('[data-testid="register-confirm-password"]', testUser.password);
    await page.click('[data-testid="register-submit"]');

    // 2. We should be on /device-enroll
    await expect(page).toHaveURL(/.*\/device-enroll/);
    await expect(page.locator('[data-testid="device-name"]')).toBeVisible();

    await page.fill('[data-testid="device-name"]', 'Corporate MacBook Pro');
    await page.selectOption('select', 'LAPTOP');

    // 3. Submit device enrollment
    await page.click('[data-testid="device-bootstrap"]');

    // 4. Verification message & redirect to login page
    await expect(page.locator('text=Device enrolled and trusted successfully')).toBeVisible();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
  });
});
