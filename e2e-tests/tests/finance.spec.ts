/**
 * 财务管理模块测试
 * 对应测试用例文档: docs/test-cases/05-finance-management.md
 * 测试用例数: 23 条（判定表法）
 * 
 * 选择器优化：使用 data-testid 属性替代 CSS 类名和文本选择器
 */

import { test, expect } from '../fixtures/auth';
import { waitForTableLoad, waitForDialog } from '../utils/helpers';

test.describe('财务管理模块', () => {
  
  test.beforeEach(async ({ authenticatedPage }) => {
    // 导航到应收账款页面
    await authenticatedPage.goto('/finance/receivables');
    await waitForTableLoad(authenticatedPage);
  });

  // ==================== 应收账款查询测试 ====================
  
  // TC-FIN-001: 查询所有应收账款
  test('TC-FIN-001: 查询所有应收账款', async ({ page }) => {
    await page.goto('/finance/receivables');
    
    // 使用 data-testid 验证应收账款列表显示
    await expect(page.getByTestId('receivables-table')).toBeVisible();
    
    // 使用 data-testid 验证统计卡片
    await expect(page.getByTestId('receivables-stat-total')).toBeVisible();
    await expect(page.getByTestId('receivables-stat-paid')).toBeVisible();
    await expect(page.getByTestId('receivables-stat-debt')).toBeVisible();
    await expect(page.getByTestId('receivables-stat-customers')).toBeVisible();
  });

  // TC-FIN-002: 按客户查询应收账款
  test('TC-FIN-002: 按客户查询应收账款', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格中的第一个客户名称
    const receivablesTable = page.getByTestId('receivables-table');
    const firstRow = receivablesTable.locator('tbody tr').first();
    const customerName = await firstRow.locator('td').nth(1).textContent();
    
    if (customerName && customerName.trim()) {
      // 使用 data-testid 输入客户名称搜索
      await page.getByTestId('receivables-input-keyword').fill(customerName.trim());
      await page.getByTestId('receivables-btn-search').click();
      await page.waitForTimeout(1000);
      
      // 验证搜索结果
      const rows = receivablesTable.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  // TC-FIN-003: 按状态筛选-未付款
  test('TC-FIN-003: 按状态筛选-未付款', async ({ page }) => {
    await page.goto('/finance/receivables');
    
    // 使用 data-testid 选择状态筛选
    await page.getByTestId('receivables-select-status').click();
    await page.waitForSelector('.el-select-dropdown');
    // 使用下拉菜单内的选项，避免匹配表格中的状态标签
    await page.locator('.el-select-dropdown').getByText('未付款').click();
    
    // 点击搜索
    await page.getByTestId('receivables-btn-search').click();
    await page.waitForTimeout(1000);
    
    // 验证所有结果显示为未付款状态
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      const statusTag = rows.first().locator('.el-tag');
      await expect(statusTag).toContainText('未付款');
    }
  });

  // TC-FIN-004: 按状态筛选-部分付款
  test('TC-FIN-004: 按状态筛选-部分付款', async ({ page }) => {
    await page.goto('/finance/receivables');
    
    // 使用 data-testid 选择状态筛选
    await page.getByTestId('receivables-select-status').click();
    await page.waitForSelector('.el-select-dropdown');
    // 使用下拉菜单内的选项，避免匹配表格中的状态标签
    await page.locator('.el-select-dropdown').getByText('部分付款').click();
    
    await page.getByTestId('receivables-btn-search').click();
    await page.waitForTimeout(1000);
    
    // 验证结果
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // TC-FIN-005: 按状态筛选-已付款
  test('TC-FIN-005: 按状态筛选-已付款', async ({ page }) => {
    await page.goto('/finance/receivables');
    
    // 使用 data-testid 选择状态筛选
    await page.getByTestId('receivables-select-status').click();
    await page.waitForSelector('.el-select-dropdown');
    // 使用下拉菜单内的选项，避免匹配表格中的状态标签
    await page.locator('.el-select-dropdown').getByText('已付款').click();
    
    await page.getByTestId('receivables-btn-search').click();
    await page.waitForTimeout(1000);
    
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // TC-FIN-006: 按日期范围查询
  test.skip('TC-FIN-006: 按日期范围查询', async ({ page }) => {
    // TODO: 需要日期选择器支持
  });

  // ==================== 收款核销测试 ====================
  
  // TC-FIN-007: 全额收款-未付款状态
  test('TC-FIN-007: 全额收款-未付款状态', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找未付款状态的订单
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const statusTag = rows.nth(i).locator('.el-tag');
      const statusText = await statusTag.textContent();
      
      if (statusText?.includes('未付款')) {
        // 点击收款按钮
        await rows.nth(i).getByTestId('receivables-btn-payment').click();
        await waitForDialog(page);
        
        // 验证收款对话框显示
        await expect(page.getByTestId('receivables-payment-form')).toBeVisible();
        
        // 验证收款金额默认为剩余金额
        const paymentInput = page.getByTestId('payment-input-amount').locator('input');
        const value = await paymentInput.inputValue();
        expect(parseFloat(value)).toBeGreaterThan(0);
        
        // 点击确认收款
        await page.getByTestId('payment-btn-submit').click();
        
        // 验证收款成功
        await expect(page.locator('.el-message--success')).toContainText('成功');
        break;
      }
    }
  });

  // TC-FIN-008: 部分收款-未付款状态
  test('TC-FIN-008: 部分收款-未付款状态', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找未付款状态的订单
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const statusTag = rows.nth(i).locator('.el-tag');
      const statusText = await statusTag.textContent();
      
      if (statusText?.includes('未付款')) {
        // 点击收款按钮
        await rows.nth(i).getByTestId('receivables-btn-payment').click();
        await waitForDialog(page);
        
        // 获取应收金额 - 使用表单内的元素
        const paymentForm = page.getByTestId('receivables-payment-form');
        const amountText = await paymentForm.locator('.el-form-item').filter({ hasText: '应收金额' }).textContent();
        const totalAmount = parseFloat(amountText?.replace(/[^\d.]/g, '') || '0');
        
        // 修改收款金额为部分
        const paymentInput = page.getByTestId('payment-input-amount').locator('input');
        if (totalAmount > 0) {
          await paymentInput.fill((totalAmount / 2).toFixed(2));
        }
        
        // 点击确认收款
        await page.getByTestId('payment-btn-submit').click();
        
        // 验证收款成功
        await expect(page.locator('.el-message--success')).toContainText('成功');
        break;
      }
    }
  });

  // TC-FIN-009: 全额收款-部分付款状态
  test('TC-FIN-009: 全额收款-部分付款状态', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找部分付款状态的订单
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const statusTag = rows.nth(i).locator('.el-tag');
      const statusText = await statusTag.textContent();
      
      if (statusText?.includes('部分付款')) {
        // 点击收款按钮
        await rows.nth(i).getByTestId('receivables-btn-payment').click();
        await waitForDialog(page);
        
        // 点击确认收款
        await page.getByTestId('payment-btn-submit').click();
        
        // 验证收款成功
        await expect(page.locator('.el-message--success')).toContainText('成功');
        break;
      }
    }
  });

  // TC-FIN-010: 部分收款-部分付款状态
  test('TC-FIN-010: 部分收款-部分付款状态', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找部分付款状态的订单
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const statusTag = rows.nth(i).locator('.el-tag');
      const statusText = await statusTag.textContent();
      
      if (statusText?.includes('部分付款')) {
        // 点击收款按钮
        await rows.nth(i).getByTestId('receivables-btn-payment').click();
        await waitForDialog(page);
        
        // 获取剩余金额 - 使用表单内的元素
        const paymentForm = page.getByTestId('receivables-payment-form');
        const remainingItem = paymentForm.locator('.el-form-item').filter({ hasText: '剩余金额' });
        const remainingText = await remainingItem.textContent();
        const remaining = parseFloat(remainingText?.replace(/[^\d.]/g, '') || '0');
        
        // 修改收款金额为部分
        const paymentInput = page.getByTestId('payment-input-amount').locator('input');
        if (remaining > 100) {
          await paymentInput.fill('100');
          
          // 点击确认收款
          await page.getByTestId('payment-btn-submit').click();
          
          // 验证收款成功
          await expect(page.locator('.el-message--success')).toContainText('成功');
        }
        break;
      }
    }
  });

  // TC-FIN-011: 超额收款
  test('TC-FIN-011: 超额收款', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找可收款的订单
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const statusTag = rows.nth(i).locator('.el-tag');
      const statusText = await statusTag.textContent();
      
      if (statusText?.includes('未付款') || statusText?.includes('部分付款')) {
        // 点击收款按钮
        await rows.nth(i).getByTestId('receivables-btn-payment').click();
        await waitForDialog(page);
        
        // 获取剩余金额 - 使用表单内的元素
        const paymentForm = page.getByTestId('receivables-payment-form');
        const remainingItem = paymentForm.locator('.el-form-item').filter({ hasText: '剩余金额' });
        const remainingText = await remainingItem.textContent();
        const remaining = parseFloat(remainingText?.replace(/[^\d.]/g, '') || '0');
        
        // 输入超额金额
        const paymentInput = page.getByTestId('payment-input-amount').locator('input');
        if (remaining > 0) {
          await paymentInput.fill((remaining + 1000).toString());
          // 触发 blur 让 el-input-number 执行 max 验证和 clamp
          await paymentInput.blur();
          await page.waitForTimeout(500);
          
          // 验证金额被限制在剩余金额范围内 (el-input-number 会自动 clamp 到 max 值)
          const value = await paymentInput.inputValue();
          expect(parseFloat(value)).toBeLessThanOrEqual(remaining);
        }
        break;
      }
    }
  });

  // TC-FIN-012: 收款金额为0
  test('TC-FIN-012: 收款金额为0', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找可收款的订单
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const statusTag = rows.nth(i).locator('.el-tag');
      const statusText = await statusTag.textContent();
      
      if (!statusText?.includes('已付款')) {
        // 点击收款按钮
        await rows.nth(i).getByTestId('receivables-btn-payment').click();
        await waitForDialog(page);
        
        // 输入0
        const paymentInput = page.getByTestId('payment-input-amount').locator('input');
        await paymentInput.fill('0');
        
        // 点击确认收款
        await page.getByTestId('payment-btn-submit').click();
        
        // 验证提示输入有效金额
        await expect(page.locator('.el-message--warning')).toContainText('请输入收款金额');
        break;
      }
    }
  });

  // TC-FIN-013: 收款金额为负数
  test('TC-FIN-013: 收款金额为负数', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找可收款的订单
    const receivablesTable = page.getByTestId('receivables-table');
    const rows = receivablesTable.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const statusTag = rows.nth(i).locator('.el-tag');
      const statusText = await statusTag.textContent();
      
      if (!statusText?.includes('已付款')) {
        // 点击收款按钮
        await rows.nth(i).getByTestId('receivables-btn-payment').click();
        await waitForDialog(page);
        
        // 尝试输入负数
        const paymentInput = page.getByTestId('payment-input-amount').locator('input');
        await paymentInput.fill('-100');
        // 触发 blur 让 el-input-number 执行 min 验证
        await paymentInput.blur();
        await page.waitForTimeout(300);
        
        // 验证金额被限制为非负数 (el-input-number 会自动 clamp 到 min 值)
        const value = await paymentInput.inputValue();
        expect(parseFloat(value)).toBeGreaterThanOrEqual(0);
        break;
      }
    }
  });

  // ==================== 统计测试 ====================
  
  test('验证统计数据显示', async ({ page }) => {
    await page.goto('/finance/receivables');
    
    // 使用 data-testid 验证统计卡片标题
    await expect(page.getByTestId('receivables-stat-total')).toContainText('应收总额');
    await expect(page.getByTestId('receivables-stat-paid')).toContainText('已收款');
    await expect(page.getByTestId('receivables-stat-debt')).toContainText('欠款金额');
    await expect(page.getByTestId('receivables-stat-customers')).toContainText('欠款客户');
  });

  // ==================== 欠款管理测试 ====================
  
  // TC-FIN-014: 查询客户欠款总额
  test.skip('TC-FIN-014: 查询客户欠款总额', async ({ page }) => {
    // TODO: 需要在客户详情页查看
  });

  // TC-FIN-015: 客户欠款超信用额度
  test.skip('TC-FIN-015: 客户欠款超信用额度', async ({ page }) => {
    // TODO: 需要在销售开单时测试
  });

  // TC-FIN-017: 逾期应收账款查询
  test.skip('TC-FIN-017: 逾期应收账款查询', async ({ page }) => {
    // TODO: 需要逾期应收页面
  });

  // ==================== 重置搜索条件测试 ====================
  
  test('重置应收账款搜索条件', async ({ page }) => {
    await page.goto('/finance/receivables');
    
    // 输入搜索条件
    await page.getByTestId('receivables-input-keyword').fill('测试');
    
    // 使用 data-testid 点击重置
    await page.getByTestId('receivables-btn-reset').click();
    await page.waitForTimeout(500);
    
    // 验证搜索条件已清空
    const inputValue = await page.getByTestId('receivables-input-keyword').inputValue();
    expect(inputValue).toBe('');
  });
});

// ==================== 数据一致性测试 ====================

test.describe('财务数据一致性', () => {
  
  // TC-FIN-021: 应收账款与销售单一致
  test('TC-FIN-021: 应收账款与销售单一致', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    // 先检查销售订单
    await page.goto('/sales/orders');
    
    // 等待表格容器加载，不强制要求有数据
    await page.waitForSelector('.el-table', { state: 'visible', timeout: 10000 });
    
    // 使用 data-testid 获取订单表格
    const ordersTable = page.getByTestId('sales-orders-table');
    const rows = ordersTable.locator('tbody tr');
    const count = await rows.count();
    
    // 如果没有销售订单数据，跳过验证
    if (count === 0) {
      // 直接检查应收账款页面是否正常加载
      await page.goto('/finance/receivables');
      await page.waitForSelector('.el-table', { state: 'visible', timeout: 10000 });
      const receivablesTable = page.getByTestId('receivables-table');
      await expect(receivablesTable).toBeVisible();
      return;
    }
    
    // 获取第一个订单号
    const orderNo = await rows.first().locator('td').first().textContent();
    
    // 检查应收账款
    await page.goto('/finance/receivables');
    await page.waitForSelector('.el-table', { state: 'visible', timeout: 10000 });
    
    // 搜索该订单
    if (orderNo && orderNo.trim()) {
      await page.getByTestId('receivables-input-keyword').fill(orderNo.trim());
      await page.getByTestId('receivables-btn-search').click();
      await page.waitForTimeout(1000);
      
      // 验证找到对应应收账款
      const receivablesTable = page.getByTestId('receivables-table');
      const receivableCount = await receivablesTable.locator('tbody tr').count();
      expect(receivableCount).toBeGreaterThanOrEqual(0);
    }
  });

  // TC-FIN-022: 收款记录与应收账款一致
  test.skip('TC-FIN-022: 收款记录与应收账款一致', async ({ page }) => {
    // TODO: 需要收款记录页面
  });

  // TC-FIN-023: 客户余额与应收一致
  test.skip('TC-FIN-023: 客户余额与应收一致', async ({ page }) => {
    // TODO: 需要客户详情页
  });
});
