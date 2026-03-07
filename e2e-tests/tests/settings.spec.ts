import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('系统设置模块', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
  });

  test('TC-SET-001: 查看系统设置', async ({ page }) => {
    await page.goto('/system/settings');
    await expect(page.locator('[data-testid="settings-form"]')).toBeVisible();
  });

  test('TC-SET-002: 修改系统名称', async ({ page }) => {
    await page.goto('/system/settings');
    await page.fill('[data-testid="system-name-input"]', 'ERP管理系统V2');
    await page.click('[data-testid="save-settings-btn"]');
    await expect(page.locator('.el-message--success')).toBeVisible();
  });

  test('TC-SET-003: 修改库存预警阈值', async ({ page }) => {
    await page.goto('/system/settings');
    await page.fill('[data-testid="inventory-threshold-input"]', '10');
    await page.click('[data-testid="save-settings-btn"]');
    await expect(page.locator('.el-message--success')).toBeVisible();
  });

  test('TC-SET-004: 开启/关闭消息通知', async ({ page }) => {
    await page.goto('/system/settings');
    await page.click('[data-testid="notification-switch"]');
    await page.click('[data-testid="save-settings-btn"]');
    await expect(page.locator('.el-message--success')).toBeVisible();
  });
});
