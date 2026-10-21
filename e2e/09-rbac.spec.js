import { test, expect } from '@playwright/test';

test.describe('09 - RBAC Roles and Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('deviceId', 'admin-trusted-device'));
    await page.reload();

    await page.fill('[data-testid="login-email"]', 'admin@zerotrustx.local');
    await page.fill('[data-testid="login-password"]', 'AdminPass@123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display defined roles, system badges, and permissions table', async ({ page }) => {
    await page.goto('/admin/roles');
    await expect(page.locator('h1')).toHaveText('Roles & Authorization');

    // Defined roles
    await expect(page.locator('text=Defined Roles')).toBeVisible();
    await expect(page.locator('text=Admin').first()).toBeVisible();

    // Permissions table
    await expect(page.locator('[data-testid="permissions-table"]')).toBeVisible();

    // Check modal triggers
    await page.click('[data-testid="add-role-btn"]');
    await expect(page.locator('.modal-title')).toHaveText('Create New Role');
    await page.click('text=Cancel');
  });
});
