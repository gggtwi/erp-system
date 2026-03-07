import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('用户管理模块', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
  });

  test('TC-USER-001: 管理员查看用户列表', async ({ page }) => {
    await page.goto('/system/users');
    await expect(page.locator('[data-testid="user-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-table"] tbody tr')).toHaveCount(4);
  });

  test('TC-USER-002: 管理员新增用户', async ({ page }) => {
    await page.goto('/system/users');
    await page.click('[data-testid="add-user-btn"]');
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'Test123456');
    await page.selectOption('[data-testid="role-select"]', 'sales');
    await page.click('[data-testid="submit-btn"]');
    await expect(page.locator('.el-message--success')).toBeVisible();
  });

  test('TC-USER-003: 管理员编辑用户', async ({ page }) => {
    await page.goto('/system/users');
    await page.click('[data-testid="user-table"] tbody tr:first-child [data-testid="edit-btn"]');
    await page.fill('[data-testid="realname-input"]', '测试用户');
    await page.click('[data-testid="submit-btn"]');
    await expect(page.locator('.el-message--success')).toBeVisible();
  });

  test('TC-USER-004: 管理员删除用户', async ({ page }) => {
    await page.goto('/system/users');
    const initialCount = await page.locator('[data-testid="user-table"] tbody tr').count();
    await page.click('[data-testid="user-table"] tbody tr:last-child [data-testid="delete-btn"]');
    await page.click('[data-testid="confirm-delete-btn"]');
    await expect(page.locator('.el-message--success')).toBeVisible();
    await expect(page.locator('[data-testid="user-table"] tbody tr')).toHaveCount(initialCount - 1);
  });

  test('TC-USER-005: 用户重置密码', async ({ page }) => {
    await page.goto('/system/users');
    await page.click('[data-testid="user-table"] tbody tr:first-child [data-testid="reset-password-btn"]');
    await page.fill('[data-testid="new-password-input"]', 'NewPass123');
    await page.click('[data-testid="submit-btn"]');
    await expect(page.locator('.el-message--success')).toBeVisible();
  });
});
