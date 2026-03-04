import { test as base, expect, Page } from '@playwright/test';

// 扩展的测试 fixture
type TestFixtures = {
  authenticatedPage: Page;
};

// 登录辅助函数
export async function login(page: Page, username: string = 'admin', password: string = 'admin123') {
  await page.goto('/login');
  
  // 等待登录页面加载
  await page.waitForSelector('input[placeholder="用户名"]', { timeout: 10000 });
  
  // 填写登录表单
  await page.fill('input[placeholder="用户名"]', username);
  await page.fill('input[placeholder="密码"]', password);
  
  // 点击登录按钮
  await page.click('button:has-text("登录")');
  
  // 等待跳转完成
  await page.waitForURL('**/inventory/products', { timeout: 15000 });
}

// 登出辅助函数
export async function logout(page: Page) {
  // 尝试找到登出按钮（可能在侧边栏或右上角）
  const logoutButton = page.locator('button:has-text("退出"), button:has-text("登出"), [data-testid="logout"]');
  if (await logoutButton.count() > 0) {
    await logoutButton.first().click();
    await page.waitForURL('**/login');
  }
}

// 扩展 test 对象
export const test = base.extend<TestFixtures>({
  // 已认证的页面 fixture
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect };
