import { test, expect } from '@playwright/test';

test.describe('03 - Authentication Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    name: `Auth User ${timestamp}`,
    email: `auth-${timestamp}@zerotrustx.test`,
    password: 'Password@123',
  };
  const deviceId = `pw-dev-${timestamp}`;

  test.beforeAll(async ({ request }) => {
    // Register via API and bootstrap device so user is ready
    const regRes = await request.post('http://localhost:5000/api/v1/auth/register', {
      data: testUser,
    });
    const regJson = await regRes.json();
    const token = regJson.bootstrapToken || regJson.data?.bootstrapToken;

    await request.post('http://localhost:5000/api/v1/devices/bootstrap', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        deviceIdentifier: deviceId,
        name: 'Automated Test Runner',
        type: 'DESKTOP',
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    // Ensure the browser uses the trusted deviceId
    await page.goto('/login');
    await page.evaluate((id) => localStorage.setItem('deviceId', id), deviceId);
    await page.reload();
  });

  test('should reject invalid credentials with clear feedback', async ({ page }) => {
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', 'WrongPassword!123');
    await page.click('[data-testid="login-submit"]');

    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error"]')).toContainText(/invalid/i);
  });

  test('should successfully authenticate and enter dashboard', async ({ page }) => {
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Security Overview');
    await expect(page.locator('[data-testid="stat-mfa-coverage"]')).toBeVisible();
  });
});
