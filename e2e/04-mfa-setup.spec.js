import { test, expect } from '@playwright/test';
import { generateSync } from 'otplib';

test.describe('04 - MFA Setup Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    name: `MFA Setup User ${timestamp}`,
    email: `mfasetup-${timestamp}@zerotrustx.test`,
    password: 'Password@123',
  };
  const devId = `mfa-dev-${timestamp}`;

  test.beforeEach(async ({ page, request }) => {
    // 1. Register & bootstrap device
    const regRes = await request.post('http://localhost:5000/api/v1/auth/register', {
      data: testUser,
    });
    const regJson = await regRes.json();
    const token = regJson.bootstrapToken || regJson.data?.bootstrapToken;

    await request.post('http://localhost:5000/api/v1/devices/bootstrap', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        deviceIdentifier: devId,
        name: 'MFA Device',
        type: 'LAPTOP',
      },
    });

    // 2. Set deviceId in browser and login
    await page.goto('/login');
    await page.evaluate((id) => localStorage.setItem('deviceId', id), devId);
    await page.reload();

    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display QR code, secret, and successfully enable MFA with valid TOTP', async ({ page }) => {
    await page.goto('/mfa-setup');

    // Click to start setup
    await page.click('[data-testid="mfa-setup-button"]');

    // Verify setup instructions and QR container
    await expect(page.locator('text=Step 1: Scan QR Code with Authenticator App')).toBeVisible();
    await expect(page.locator('[data-testid="mfa-verify-input"]')).toBeVisible();

    // Extract secret displayed for manual entry
    const secretText = await page.inputValue('[data-testid="mfa-secret-display"]');
    expect(secretText).toBeTruthy();

    // Generate real TOTP code using otplib
    const code = generateSync({
      type: 'totp',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secretText.trim(),
    });

    // Fill and submit verification
    await page.fill('[data-testid="mfa-verify-input"]', code);
    await page.click('[data-testid="mfa-enable-submit"]');

    // Should indicate success
    await expect(page.locator('text=Active & Enforced')).toBeVisible();
    await expect(page.locator('[data-testid="mfa-disable-input"]')).toBeVisible();
  });
});
