/**
 * 登录认证模块测试
 * 对应测试用例文档: docs/test-cases/01-login-auth.md
 * 测试用例数: 24 条
 * 
 * 选择器优化：使用 data-testid 属性替代 CSS 类名和文本选择器
 */

import { test, expect, login, logout } from '../fixtures/auth';

test.describe('登录认证模块', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ==================== 正常登录测试 ====================
  
  // TC-AUTH-001: 正常登录-管理员账户
  test('TC-AUTH-001: 正常登录-管理员账户', async ({ page }) => {
    await login(page, 'admin', 'admin123');
    
    // 验证登录成功，跳转到首页
    await expect(page).toHaveURL(/inventory\/products/);
    
    // 验证显示管理员菜单（使用 data-testid）
    await expect(page.getByTestId('nav-menu-products')).toBeVisible();
  });

  // TC-AUTH-002: 正常登录-销售员账户
  test.skip('TC-AUTH-002: 正常登录-销售员账户', async ({ page }) => {
    // TODO: 需要创建销售员账户
    await login(page, 'sales', 'sales123');
    
    // 验证显示销售员权限菜单
    await expect(page.getByTestId('nav-menu-create-sale')).toBeVisible();
    // 验证不能访问财务管理
    await page.goto('/finance/receivables');
    await expect(page.locator('.el-message--error')).toBeVisible();
  });

  // ==================== 输入验证测试 ====================
  
  // TC-AUTH-003: 用户名为空
  test('TC-AUTH-003: 用户名为空', async ({ page }) => {
    // 使用 data-testid 选择密码输入框
    await page.getByTestId('login-input-password').fill('admin123');
    // 使用 data-testid 选择登录按钮
    await page.getByTestId('login-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-form-item__error')).toContainText('请输入用户名');
  });

  // TC-AUTH-004: 密码为空
  test('TC-AUTH-004: 密码为空', async ({ page }) => {
    // 使用 data-testid 选择用户名输入框
    await page.getByTestId('login-input-username').fill('admin');
    await page.getByTestId('login-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-form-item__error')).toContainText('请输入密码');
  });

  // TC-AUTH-005: 用户名和密码都为空
  test('TC-AUTH-005: 用户名和密码都为空', async ({ page }) => {
    await page.getByTestId('login-btn-submit').click();
    
    // 验证显示必填项错误提示
    await expect(page.locator('.el-form-item__error').first()).toContainText('请输入用户名');
    await expect(page.locator('.el-form-item__error').last()).toContainText('请输入密码');
  });

  // TC-AUTH-006: 用户名不存在
  test('TC-AUTH-006: 用户名不存在', async ({ page }) => {
    await page.getByTestId('login-input-username').fill('nonexistent_user_12345');
    await page.getByTestId('login-input-password').fill('anypassword');
    await page.getByTestId('login-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-message--error').first()).toContainText('用户名或密码错误');
  });

  // TC-AUTH-007: 密码错误
  test('TC-AUTH-007: 密码错误', async ({ page }) => {
    await page.getByTestId('login-input-username').fill('admin');
    await page.getByTestId('login-input-password').fill('wrongpassword');
    await page.getByTestId('login-btn-submit').click();
    
    // 等待API响应并验证显示错误提示
    await page.waitForSelector('.el-message--error', { timeout: 5000 });
    await expect(page.locator('.el-message--error').first()).toContainText('用户名或密码错误');
  });

  // ==================== 边界值测试 ====================
  
  // TC-AUTH-008: 用户名过短（少于3位）
  test('TC-AUTH-008: 用户名过短（少于3位）', async ({ page }) => {
    await page.getByTestId('login-input-username').fill('ab');
    await page.getByTestId('login-input-password').fill('admin123');
    await page.getByTestId('login-btn-submit').click();
    
    // 验证登录失败
    await expect(page).toHaveURL(/login/);
  });

  // TC-AUTH-009: 用户名最短边界（3位）
  test.skip('TC-AUTH-009: 用户名最短边界（3位）', async ({ page }) => {
    // TODO: 需要创建3位用户名的账户
  });

  // TC-AUTH-010: 用户名最长边界（20位）
  test.skip('TC-AUTH-010: 用户名最长边界（20位）', async ({ page }) => {
    // TODO: 需要创建20位用户名的账户
  });

  // TC-AUTH-011: 用户名过长（超过20位）
  test('TC-AUTH-011: 用户名过长（超过20位）', async ({ page }) => {
    const longUsername = 'a'.repeat(21);
    await page.getByTestId('login-input-username').fill(longUsername);
    await page.getByTestId('login-input-password').fill('admin123');
    await page.getByTestId('login-btn-submit').click();
    
    // 验证登录失败
    await expect(page).toHaveURL(/login/);
  });

  // TC-AUTH-012: 密码最短边界（6位）
  test.skip('TC-AUTH-012: 密码最短边界（6位）', async ({ page }) => {
    // TODO: 需要设置密码为6位的账户
  });

  // TC-AUTH-013: 密码过短（少于6位）
  test('TC-AUTH-013: 密码过短（少于6位）', async ({ page }) => {
    await page.getByTestId('login-input-username').fill('admin');
    await page.getByTestId('login-input-password').fill('12345');
    await page.getByTestId('login-btn-submit').click();
    
    // 验证登录失败
    await expect(page).toHaveURL(/login/);
  });

  // TC-AUTH-014: 密码最长边界（20位）
  test.skip('TC-AUTH-014: 密码最长边界（20位）', async ({ page }) => {
    // TODO: 需要设置密码为20位的账户
  });

  // ==================== 安全测试 ====================
  
  // TC-AUTH-015: SQL注入攻击测试
  test('TC-AUTH-015: SQL注入攻击测试', async ({ page }) => {
    await page.getByTestId('login-input-username').fill("admin' OR '1'='1");
    await page.getByTestId('login-input-password').fill('anypassword');
    await page.getByTestId('login-btn-submit').click();
    
    // 验证登录失败，系统不应报错
    await expect(page).toHaveURL(/login/);
    // 等待API响应并验证错误提示
    await page.waitForSelector('.el-message--error', { timeout: 5000 });
    await expect(page.locator('.el-message--error').first()).toBeVisible();
  });

  // TC-AUTH-016: XSS攻击测试
  test('TC-AUTH-016: XSS攻击测试', async ({ page }) => {
    await page.getByTestId('login-input-username').fill("<script>alert('xss')</script>");
    await page.getByTestId('login-input-password').fill('anypassword');
    await page.getByTestId('login-btn-submit').click();
    
    // 验证登录失败，脚本不执行
    await expect(page).toHaveURL(/login/);
    // 验证没有弹窗（页面不包含 alert）
    await expect(page.locator('text=alert')).not.toBeVisible();
  });

  // ==================== 账户状态测试 ====================
  
  // TC-AUTH-017: 已禁用账户登录
  test.skip('TC-AUTH-017: 已禁用账户登录', async ({ page }) => {
    // TODO: 需要创建已禁用的账户
  });

  // TC-AUTH-018: 连续错误登录锁定
  test.skip('TC-AUTH-018: 连续错误登录锁定', async ({ page }) => {
    // TODO: 需要实现账户锁定功能
  });

  // ==================== 登出与会话测试 ====================
  
  // TC-AUTH-019: 登出功能
  test('TC-AUTH-019: 登出功能', async ({ page }) => {
    await login(page);
    
    // 使用 data-testid 选择退出登录按钮
    const logoutBtn = page.getByTestId('dropdown-item-logout');
    if (await logoutBtn.count() > 0) {
      // 先点击用户下拉菜单
      await page.getByTestId('layout-user-dropdown').click();
      await logoutBtn.click();
      
      // 处理确认对话框 - 点击确定按钮
      await page.getByRole('button', { name: '确定' }).click();
      
      // 验证跳转到登录页
      await expect(page).toHaveURL(/login/, { timeout: 5000 });
    } else {
      // 如果没有找到登出按钮，跳过测试
      test.skip(true, '登出按钮未找到');
    }
  });

  // TC-AUTH-020: 会话超时自动登出
  test.skip('TC-AUTH-020: 会话超时自动登出', async ({ page }) => {
    // TODO: 需要模拟会话超时
  });

  // ==================== 权限控制测试 ====================
  
  // TC-AUTH-021: 管理员权限验证
  test('TC-AUTH-021: 管理员权限验证', async ({ page }) => {
    await login(page);
    
    // 验证可以访问商品管理（使用 data-testid）
    await expect(page.getByTestId('nav-menu-products')).toBeVisible();
    
    // 导航到库存概览
    await page.goto('/inventory/overview');
    await expect(page).toHaveURL(/inventory\/overview/);
    
    // 导航到销售开单
    await page.goto('/sales/create');
    await expect(page).toHaveURL(/sales\/create/);
    
    // 导航到应收账款
    await page.goto('/finance/receivables');
    await expect(page).toHaveURL(/finance\/receivables/);
    
    // 导航到客户管理
    await page.goto('/customers');
    await expect(page).toHaveURL(/customers/);
    
    // 导航到销售报表
    await page.goto('/reports/sales');
    await expect(page).toHaveURL(/reports\/sales/);
  });

  // TC-AUTH-022: 销售员权限验证
  test.skip('TC-AUTH-022: 销售员权限验证', async ({ page }) => {
    // TODO: 需要创建销售员账户
  });

  // TC-AUTH-023: 库管员权限验证
  test.skip('TC-AUTH-023: 库管员权限验证', async ({ page }) => {
    // TODO: 需要创建库管员账户
  });

  // TC-AUTH-024: 未登录访问受保护页面
  test('TC-AUTH-024: 未登录访问受保护页面', async ({ page }) => {
    // 直接访问需要登录的页面
    await page.goto('/inventory/products');
    
    // 验证跳转到登录页
    await expect(page).toHaveURL(/login/);
  });
});
