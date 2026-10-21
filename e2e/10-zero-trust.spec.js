import { test, expect } from '@playwright/test';

test.describe('10 - Zero Trust Dynamic Evaluation Engine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('deviceId', 'admin-trusted-device'));
    await page.reload();

    await page.fill('[data-testid="login-email"]', 'admin@zerotrustx.local');
    await page.fill('[data-testid="login-password"]', 'AdminPass@123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should evaluate access request and display structured Zero Trust signal matrix', async ({ page }) => {
    await page.goto('/access-requests');
    await expect(page.locator('h1')).toHaveText('Access Control Engine');

    // Ensure resource select is populated
    const resourceSelect = page.locator('[data-testid="access-resource-select"]');
    await expect(resourceSelect).toBeVisible();

    // Select first available resource (skip placeholder index 0)
    await resourceSelect.selectOption({ index: 1 });

    // Submit evaluation
    await page.click('[data-testid="evaluate-access-btn"]');

    // Should display verdict result
    await expect(page.locator('[data-testid="access-decision-result"]')).toBeVisible();
    await expect(page.locator('text=Zero Trust Signal Matrix')).toBeVisible();
  });
});
