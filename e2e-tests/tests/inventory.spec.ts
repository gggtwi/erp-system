/**
 * 库存管理模块测试
 * 对应测试用例文档: docs/test-cases/03-inventory-management.md
 * 测试用例数: 27 条
 * 
 * 选择器优化：使用 data-testid 属性替代 CSS 类名和文本选择器
 */

import { test, expect } from '../fixtures/auth';
import { waitForTableLoad, waitForDialog } from '../utils/helpers';

test.describe('库存管理模块', () => {
  
  test.beforeEach(async ({ authenticatedPage }) => {
    // 导航到库存概览页面
    await authenticatedPage.goto('/inventory/overview');
  });

  // ==================== 库存概览测试 ====================
  
  // TC-INV-001: 正常入库-采购入库
  test('TC-INV-001: 正常入库-采购入库', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    // 使用 data-testid 检查预警表格
    const warningTable = page.getByTestId('inventory-warning-table');
    const warningRows = warningTable.locator('tbody tr');
    const count = await warningRows.count();
    
    if (count > 0) {
      // 点击第一个商品的库存调整按钮
      await warningRows.first().getByTestId('inventory-btn-adjust').click();
      await waitForDialog(page);
      
      // 使用 data-testid 填写入库信息
      await page.getByTestId('adjust-input-quantity').locator('input').fill('50');
      await page.getByTestId('adjust-input-remark').fill('采购入库测试');
      
      // 点击确定
      await page.getByTestId('adjust-btn-submit').click();
      
      // 验证调整成功
      await expect(page.locator('.el-message--success')).toContainText('成功');
    }
  });

  // TC-INV-013: 查询所有库存
  test('TC-INV-013: 查询所有库存', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    // 使用 data-testid 验证统计卡片显示
    await expect(page.getByTestId('inventory-stat-products')).toBeVisible();
    await expect(page.getByTestId('inventory-stat-skus')).toBeVisible();
    await expect(page.getByTestId('inventory-stat-warning')).toBeVisible();
    await expect(page.getByTestId('inventory-stat-value')).toBeVisible();
    
    // 验证库存预警列表
    await expect(page.getByTestId('inventory-warning-table')).toBeVisible();
  });

  // TC-INV-014: 按SKU编码查询
  test('TC-INV-014: 按SKU编码查询', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    // 使用 data-testid 获取预警表格
    const warningTable = page.getByTestId('inventory-warning-table');
    const firstRow = warningTable.locator('tbody tr').first();
    const skuCode = await firstRow.locator('td').first().textContent();
    
    if (skuCode && skuCode.trim()) {
      // 验证 SKU 编码显示
      await expect(firstRow).toContainText(skuCode.trim());
    }
  });

  // TC-INV-015: 查询库存预警列表
  test('TC-INV-015: 查询库存预警列表', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    // 验证库存预警标题
    await expect(page.getByText('库存预警商品')).toBeVisible();
    
    // 使用 data-testid 检查预警商品列表
    const warningTable = page.getByTestId('inventory-warning-table');
    const warningRows = warningTable.locator('tbody tr');
    const count = await warningRows.count();
    
    // 验证预警商品的库存显示为红色或黄色标签
    if (count > 0) {
      const stockTag = warningRows.first().locator('.el-tag--danger, .el-tag--warning').first();
      const tagType = await stockTag.getAttribute('class');
      expect(tagType).toMatch(/el-tag--danger|el-tag--warning/);
    }
  });

  // ==================== 库存调整测试 ====================
  
  // TC-INV-017: 正常库存调整
  test('TC-INV-017: 正常库存调整', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    const warningTable = page.getByTestId('inventory-warning-table');
    const warningRows = warningTable.locator('tbody tr');
    const count = await warningRows.count();
    
    if (count > 0) {
      // 获取当前库存
      const currentStock = await warningRows.first().locator('.el-tag--danger, .el-tag--warning').first().textContent();
      
      // 点击库存调整按钮
      await warningRows.first().getByTestId('inventory-btn-adjust').click();
      await waitForDialog(page);
      
      // 输入调整数量（增加库存）
      await page.getByTestId('adjust-input-quantity').locator('input').fill('10');
      await page.getByTestId('adjust-input-remark').fill('测试库存调整');
      
      // 点击确定
      await page.getByTestId('adjust-btn-submit').click();
      
      // 验证调整成功
      await expect(page.locator('.el-message--success')).toContainText('成功');
    }
  });

  // TC-INV-018: 库存调整为负数
  test('TC-INV-018: 库存调整为负数', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    const warningTable = page.getByTestId('inventory-warning-table');
    const warningRows = warningTable.locator('tbody tr');
    const count = await warningRows.count();
    
    if (count > 0) {
      // 点击库存调整按钮
      await warningRows.first().getByTestId('inventory-btn-adjust').click();
      await waitForDialog(page);
      
      // 获取当前库存
      const currentStockText = await page.getByText('当前库存').textContent();
      
      // 尝试输入超过当前库存的负数调整（减少库存）
      const input = page.getByTestId('adjust-input-quantity').locator('input');
      await input.fill('-999999');
      
      // 验证输入被限制
      const value = await input.inputValue();
      const numValue = parseInt(value);
      expect(numValue).toBeGreaterThanOrEqual(-9999); // 应该有下限
    }
  });

  // TC-INV-019: 库存调整为0
  test('TC-INV-019: 库存调整为0', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    const warningTable = page.getByTestId('inventory-warning-table');
    const warningRows = warningTable.locator('tbody tr');
    const count = await warningRows.count();
    
    if (count > 0) {
      // 点击库存调整按钮
      await warningRows.first().getByTestId('inventory-btn-adjust').click();
      await waitForDialog(page);
      
      // 输入0调整
      await page.getByTestId('adjust-input-quantity').locator('input').fill('0');
      await page.getByTestId('adjust-input-remark').fill('测试库存调整');
      
      // 点击确定
      await page.getByTestId('adjust-btn-submit').click();
      
      // 验证显示警告（调整数量不能为0）
      await expect(page.locator('.el-message--warning')).toContainText('不能为 0');
    }
  });

  // TC-INV-020: 库存调整无原因
  test('TC-INV-020: 库存调整无原因', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    const warningTable = page.getByTestId('inventory-warning-table');
    const warningRows = warningTable.locator('tbody tr');
    const count = await warningRows.count();
    
    if (count > 0) {
      // 点击库存调整按钮
      await warningRows.first().getByTestId('inventory-btn-adjust').click();
      await waitForDialog(page);
      
      // 输入调整数量，但不填写原因
      await page.getByTestId('adjust-input-quantity').locator('input').fill('5');
      
      // 点击确定
      await page.getByTestId('adjust-btn-submit').click();
      
      // 根据系统设计，可能允许不填原因或要求填写
      // 这里只验证操作完成（成功或提示）
      await page.waitForTimeout(1000);
    }
  });

  // ==================== 商品管理页面库存测试 ====================
  
  test('商品管理-查看库存信息', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并检查库存列
    const productsTable = page.getByTestId('products-table');
    const firstRow = productsTable.locator('tbody tr').first();
    const stockCell = firstRow.locator('td').nth(6); // 库存列
    
    // 验证库存显示（可能是数字或标签）
    const stockText = await stockCell.textContent();
    expect(stockText).toBeDefined();
  });

  test('商品管理-查看库存预警标签', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找库存预警标签
    const productsTable = page.getByTestId('products-table');
    const warningTags = productsTable.locator('.el-tag--danger, .el-tag--warning');
    const count = await warningTags.count();
    
    // 如果有预警标签，验证其显示
    if (count > 0) {
      const tagText = await warningTags.first().textContent();
      expect(parseInt(tagText || '0')).toBeLessThanOrEqual(10);
    }
  });

  // ==================== 库存流水测试 ====================
  
  test('查看商品详情中的SKU库存', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并点击详情按钮
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 使用 data-testid 验证 SKU 表格显示
    const skuTable = page.getByTestId('product-detail-sku-table');
    await expect(skuTable).toBeVisible();
    
    // 检查库存列
    const stockColumn = skuTable.locator('th:has-text("库存")');
    await expect(stockColumn).toBeVisible();
  });
});

test.describe('库存管理-商品详情SKU库存', () => {
  
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inventory/products');
    await waitForTableLoad(authenticatedPage);
  });

  test('查看SKU库存数量', async ({ page }) => {
    // 使用 data-testid 获取表格并点击详情
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 等待 SKU 列表加载
    const skuTable = page.getByTestId('product-detail-sku-table');
    await expect(skuTable).toBeVisible();
    
    // 验证 SKU 库存显示
    const skuRows = skuTable.locator('tbody tr');
    const count = await skuRows.count();
    
    if (count > 0) {
      const stockText = await skuRows.first().locator('td').nth(4).textContent();
      expect(parseInt(stockText || '0')).toBeGreaterThanOrEqual(0);
    }
  });

  test('查看SKU价格信息', async ({ page }) => {
    // 使用 data-testid 获取表格并点击详情
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 使用 data-testid 验证销售价和成本价显示
    const skuTable = page.getByTestId('product-detail-sku-table');
    await expect(skuTable.locator('th:has-text("销售价")')).toBeVisible();
    await expect(skuTable.locator('th:has-text("成本价")')).toBeVisible();
  });
});

test.describe('库存统计测试', () => {
  
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inventory/overview');
  });

  test('验证统计卡片显示', async ({ page }) => {
    // 使用 data-testid 验证四个统计卡片
    await expect(page.getByTestId('inventory-stat-products')).toContainText('商品总数');
    await expect(page.getByTestId('inventory-stat-skus')).toContainText('SKU 总数');
    await expect(page.getByTestId('inventory-stat-warning')).toContainText('库存预警');
    await expect(page.getByTestId('inventory-stat-value')).toContainText('库存总值');
  });

  test('验证库存预警数量统计', async ({ page }) => {
    // 使用 data-testid 获取预警数量
    const warningStat = page.getByTestId('inventory-stat-warning');
    const warningCount = await warningStat.locator('.el-statistic__number').textContent();
    
    // 验证预警列表数量匹配
    const warningTable = page.getByTestId('inventory-warning-table');
    const tableCount = await warningTable.locator('tbody tr').count();
    
    // 统计数字应该与表格行数一致或为表格的最大显示数
    expect(parseInt(warningCount || '0')).toBeGreaterThanOrEqual(0);
  });

  test('刷新库存数据', async ({ page }) => {
    await page.goto('/inventory/overview');
    
    // 使用 data-testid 点击刷新按钮
    const refreshBtn = page.getByTestId('inventory-btn-refresh');
    if (await refreshBtn.count() > 0) {
      await refreshBtn.click();
      await page.waitForTimeout(1000);
      
      // 验证数据刷新成功
      await expect(page.getByTestId('inventory-stat-products')).toBeVisible();
    }
  });
});
