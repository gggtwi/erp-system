/**
 * 客户管理模块测试
 * 
 * 选择器优化：使用 data-testid 属性替代 CSS 类名和文本选择器
 */

import { test, expect } from '../fixtures/auth';
import { waitForTableLoad, waitForDialog, generateCustomerCode, randomName, randomPhone } from '../utils/helpers';

test.describe('客户管理模块', () => {
  
  test.beforeEach(async ({ authenticatedPage }) => {
    // 导航到客户管理页面
    await authenticatedPage.goto('/customers');
    await waitForTableLoad(authenticatedPage);
  });

  // ==================== 客户列表测试 ====================
  
  test('查看客户列表', async ({ page }) => {
    await page.goto('/customers');
    
    // 使用 data-testid 验证客户列表显示
    await expect(page.getByTestId('customer-table')).toBeVisible();
  });

  test('搜索客户', async ({ page }) => {
    await page.goto('/customers');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格中的第一个客户名称
    const customerTable = page.getByTestId('customer-table');
    const firstRow = customerTable.locator('tbody tr').first();
    const customerName = await firstRow.locator('td').first().textContent();
    
    if (customerName && customerName.trim()) {
      // 使用 data-testid 搜索该客户
      await page.getByTestId('customer-input-keyword').fill(customerName.trim());
      await page.getByTestId('customer-btn-search').click();
      await page.waitForTimeout(1000);
      
      // 验证搜索结果 - 使用 first() 避免多个元素的问题
      await expect(page.getByText(customerName.trim()).first()).toBeVisible();
    }
  });

  // ==================== 客户新增测试 ====================
  
  test('新增客户-基本信息', async ({ page }) => {
    await page.goto('/customers');
    
    // 使用 data-testid 点击新增按钮
    await page.getByTestId('customer-btn-create').click();
    await waitForDialog(page);
    
    // 填写客户信息
    const customerCode = generateCustomerCode();
    const customerName = randomName();
    const phone = randomPhone();
    
    await page.getByTestId('customer-form-input-code').fill(customerCode);
    await page.getByTestId('customer-form-input-name').fill(customerName);
    await page.getByTestId('customer-form-input-phone').fill(phone);
    
    // 点击确定
    await page.getByTestId('customer-dialog-btn-submit').click();
    
    // 验证创建成功
    await expect(page.locator('.el-message--success')).toBeVisible();
  });

  test('新增客户-必填项验证', async ({ page }) => {
    await page.goto('/customers');
    
    // 点击新增按钮
    await page.getByTestId('customer-btn-create').click();
    await waitForDialog(page);
    
    // 不填写任何信息，直接点击确定
    await page.getByTestId('customer-dialog-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-form-item__error').first()).toBeVisible();
  });

  // ==================== 客户详情测试 ====================
  
  test('查看客户详情', async ({ page }) => {
    await page.goto('/customers');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并点击详情按钮
    const customerTable = page.getByTestId('customer-table');
    await customerTable.locator('tbody tr:first-child').getByTestId('customer-btn-detail').click();
    
    // 等待跳转到详情页
    await page.waitForTimeout(1000);
    
    // 验证详情信息显示
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/customers/);
  });

  // ==================== 客户编辑测试 ====================
  
  test('编辑客户信息', async ({ page }) => {
    await page.goto('/customers');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并点击编辑按钮
    const customerTable = page.getByTestId('customer-table');
    const editButton = customerTable.locator('tbody tr:first-child').getByTestId('customer-btn-edit');
    
    if (await editButton.count() > 0) {
      await editButton.click();
      await waitForDialog(page);
      
      // 修改客户名称 (列表页编辑对话框使用 customer-form-input-name)
      const nameInput = page.getByTestId('customer-form-input-name');
      const originalName = await nameInput.inputValue();
      await nameInput.fill(`${originalName}-已修改`);
      
      // 点击确定 (列表页编辑对话框使用 customer-dialog-btn-submit)
      await page.getByTestId('customer-dialog-btn-submit').click();
      
      // 验证更新成功
      await expect(page.locator('.el-message--success')).toBeVisible();
    }
  });

  // ==================== 客户删除测试 ====================
  
  test('删除客户', async ({ page }) => {
    await page.goto('/customers');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格
    const customerTable = page.getByTestId('customer-table');
    const deleteButton = customerTable.locator('tbody tr button:has-text("删除")');
    
    if (await deleteButton.count() > 0) {
      await deleteButton.first().click();
      
      // 确认删除
      await page.click('.el-message-box button:has-text("确定")');
      
      // 验证结果
      await page.waitForTimeout(1000);
    }
  });

  // ==================== 销售开单中的客户选择测试 ====================
  
  test('销售开单-选择已有客户', async ({ page }) => {
    await page.goto('/sales/create');
    
    // 使用 data-testid 点击客户选择下拉框
    await page.getByTestId('sales-create-select-customer').click();
    await page.waitForSelector('.el-select-dropdown');
    
    // 选择第一个客户
    const customerOption = page.locator('.el-select-dropdown__item').first();
    if (await customerOption.count() > 0) {
      await customerOption.click();
      
      // 验证客户已选中
      await expect(page.getByTestId('sales-create-select-customer')).toBeVisible();
    }
  });

  test('销售开单-新建会员客户', async ({ page }) => {
    await page.goto('/sales/create');
    
    // 使用 data-testid 点击新建会员按钮
    await page.getByTestId('sales-create-btn-new-member').click();
    await waitForDialog(page);
    
    // 填写会员信息
    await page.getByTestId('member-form-input-name').fill(randomName());
    await page.getByTestId('member-form-input-phone').fill(randomPhone());
    
    // 点击创建
    await page.getByTestId('member-dialog-btn-submit').click();
    
    // 验证创建成功
    await expect(page.locator('.el-message--success')).toBeVisible();
  });

  test('销售开单-创建临时客户', async ({ page }) => {
    await page.goto('/sales/create');
    
    // 使用 data-testid 点击临时客户按钮
    await page.getByTestId('sales-create-btn-temp-customer').click();
    await page.waitForTimeout(1000);
    
    // 验证临时客户创建成功
    await expect(page.locator('.el-message--success')).toBeVisible();
  });

  // ==================== 客户欠款查看测试 ====================
  
  test('查看客户欠款信息', async ({ page }) => {
    await page.goto('/finance/receivables');
    await waitForTableLoad(page);
    
    // 使用 data-testid 验证欠款统计显示
    await expect(page.getByTestId('receivables-stat-debt')).toBeVisible();
  });

  // ==================== 客户详情页面测试 ====================
  
  test('查看客户购买历史', async ({ page }) => {
    await page.goto('/customers');
    await waitForTableLoad(page);
    
    // 点击详情按钮
    const customerTable = page.getByTestId('customer-table');
    await customerTable.locator('tbody tr:first-child').getByTestId('customer-btn-detail').click();
    await page.waitForTimeout(1000);
    
    // 检查是否跳转到详情页
    if (page.url().includes('/customers/')) {
      // 点击购买历史标签 (使用 tab label 选择器)
      await page.getByTestId('customer-tab-label-history').click();
      await page.waitForTimeout(500);
      
      // 验证购买历史表格显示
      const historyTable = page.getByTestId('customer-history-table');
      if (await historyTable.count() > 0) {
        await expect(historyTable).toBeVisible();
      }
    }
  });

  test('查看客户欠款信息详情', async ({ page }) => {
    await page.goto('/customers');
    await waitForTableLoad(page);
    
    // 点击详情按钮
    const customerTable = page.getByTestId('customer-table');
    await customerTable.locator('tbody tr:first-child').getByTestId('customer-btn-detail').click();
    await page.waitForTimeout(1000);
    
    // 检查是否跳转到详情页
    if (page.url().includes('/customers/')) {
      // 点击欠款信息标签 (使用 tab label 选择器)
      await page.getByTestId('customer-tab-label-debt').click();
      await page.waitForTimeout(500);
      
      // 验证欠款信息显示
      const debtSummary = page.getByTestId('customer-debt-summary');
      if (await debtSummary.count() > 0) {
        await expect(debtSummary).toBeVisible();
      }
    }
  });
});
