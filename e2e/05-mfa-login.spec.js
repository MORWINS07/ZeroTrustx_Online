import { test, expect } from '@playwright/test';
import { generateSync } from 'otplib';

test.describe('05 - MFA Login Challenge Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    name: `MFA Challenge User ${timestamp}`,
    email: `mfalogin-${timestamp}@zerotrustx.test`,
    password: 'Password@123',
  };
  const devId = `mfalogin-dev-${timestamp}`;
  let userSecret = '';

  test.beforeAll(async ({ request }) => {
    // 1. Register
    const regRes = await request.post('http://localhost:5000/api/v1/auth/register', {
      data: testUser,
    });
    const regJson = await regRes.json();
    const bToken = regJson.bootstrapToken || regJson.data?.bootstrapToken;

    // 2. Bootstrap device
    await request.post('http://localhost:5000/api/v1/devices/bootstrap', {
      headers: { Authorization: `Bearer ${bToken}` },
      data: {
        deviceIdentifier: devId,
        name: 'Challenge Laptop',
        type: 'LAPTOP',
      },
    });

    // 3. Login
    const loginRes = await request.post('http://localhost:5000/api/v1/auth/login', {
      headers: { 'X-Device-Id': devId },
      data: { email: testUser.email, password: testUser.password },
    });
    const loginJson = await loginRes.json();
    const accessToken = loginJson.accessToken;

    // 4. Setup MFA
    const mfaSetupRes = await request.post('http://localhost:5000/api/v1/mfa/setup', {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-Id': devId },
    });
    const mfaJson = await mfaSetupRes.json();
    userSecret = mfaJson.secret;

    // 5. Verify & enable MFA
    const totpCode = generateSync({
      type: 'totp',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: userSecret,
    });

    await request.post('http://localhost:5000/api/v1/mfa/verify', {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-Id': devId },
      data: { token: totpCode },
    });
  });

  test('should prompt for MFA challenge and complete login on valid TOTP code', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((id) => localStorage.setItem('deviceId', id), devId);
    await page.reload();

    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');

    // Should be redirected to /mfa-verify
    await expect(page).toHaveURL(/.*\/mfa-verify/);
    await expect(page.locator('h1')).toContainText('Two-Factor Authentication');
    await expect(page.locator('[data-testid="mfa-code"]')).toBeVisible();

    // Generate valid TOTP
    const code = generateSync({
      type: 'totp',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: userSecret,
    });

    await page.fill('[data-testid="mfa-code"]', code);
    await page.click('[data-testid="mfa-submit"]');

    // Should successfully land on dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Security Overview');
  });
});
