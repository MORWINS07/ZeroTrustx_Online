import { test, expect } from '@playwright/test';

test.describe('01 - User Registration Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    name: `User ${timestamp}`,
    email: `playwright-${timestamp}@zerotrustx.test`,
    password: 'Password@123',
  };

  test('should render registration page with accessible form inputs', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create Account');
    await expect(page.locator('[data-testid="register-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-confirm-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();
  });

  test('should register a new user and redirect to device enrollment with bootstrap token', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[data-testid="register-name"]', testUser.name);
    await page.fill('[data-testid="register-email"]', testUser.email);
    await page.fill('[data-testid="register-password"]', testUser.password);
    await page.fill('[data-testid="register-confirm-password"]', testUser.password);

    await page.click('[data-testid="register-submit"]');

    // Should redirect to device enrollment
    await expect(page).toHaveURL(/.*\/device-enroll/);
    await expect(page.locator('h1')).toContainText('Device Enrollment');

    // Verify bootstrap token exists in session
    const bootstrapToken = await page.evaluate(() => sessionStorage.getItem('bootstrapToken'));
    expect(bootstrapToken).toBeTruthy();
  });
});
