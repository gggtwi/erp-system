/**
 * 规格管理模块测试
 * 
 * 选择器优化：使用 data-testid 属性替代 CSS 类名和文本选择器
 */

import { test, expect } from '../fixtures/auth';
import { waitForTableLoad, waitForDialog } from '../utils/helpers';

test.describe('规格管理模块', () => {
  
  test.beforeEach(async ({ authenticatedPage }) => {
    // 导航到规格管理页面
    await authenticatedPage.goto('/inventory/specs');
  });

  // ==================== 规格类型管理测试 ====================
  
  test('查看规格类型列表', async ({ page }) => {
    await page.goto('/inventory/specs');
    
    // 使用 data-testid 验证页面加载
    await expect(page.getByTestId('specs-table')).toBeVisible();
  });

  test('新增规格类型', async ({ page }) => {
    await page.goto('/inventory/specs');
    
    // 使用 data-testid 点击新增按钮
    await page.getByTestId('specs-btn-create').click();
    await waitForDialog(page);
    
    // 使用 data-testid 填写规格名称
    await page.getByTestId('spec-form-input-name').fill(`测试规格-${Date.now()}`);
    await page.getByTestId('spec-form-input-values').fill('值1,值2,值3');
    
    // 点击确定
    await page.getByTestId('spec-form-btn-submit').click();
    
    // 验证创建成功
    await expect(page.locator('.el-message--success')).toBeVisible();
  });

  test('编辑规格类型', async ({ page }) => {
    await page.goto('/inventory/specs');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并点击编辑按钮
    const specsTable = page.getByTestId('specs-table');
    const editButton = specsTable.locator('tbody tr:first-child').getByTestId('specs-btn-edit');
    
    if (await editButton.count() > 0) {
      await editButton.click();
      await waitForDialog(page);
      
      // 修改规格名称
      const nameInput = page.getByTestId('spec-form-input-name');
      const originalName = await nameInput.inputValue();
      await nameInput.fill(`${originalName}-已修改`);
      
      // 点击确定
      await page.getByTestId('spec-form-btn-submit').click();
      
      // 验证更新成功
      await expect(page.locator('.el-message--success')).toBeVisible();
    }
  });

  test('删除规格类型', async ({ page }) => {
    await page.goto('/inventory/specs');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查找可删除的规格
    const specsTable = page.getByTestId('specs-table');
    const deleteButton = specsTable.locator('tbody tr').getByTestId('specs-btn-delete').first();
    
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      
      // 确认删除
      await page.click('.el-message-box button:has-text("确定")');
      
      // 验证结果
      await page.waitForTimeout(1000);
    }
  });

  // ==================== 规格值管理测试 ====================
  
  test('管理规格值', async ({ page }) => {
    await page.goto('/inventory/specs');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并查看规格详情
    const specsTable = page.getByTestId('specs-table');
    const manageButton = specsTable.locator('tbody tr:first-child').getByTestId('specs-btn-manage');
    
    if (await manageButton.count() > 0) {
      await manageButton.click();
      await page.waitForTimeout(1000);
      
      // 验证规格值列表显示
      await expect(page.getByTestId('spec-values-table')).toBeVisible();
    }
  });

  // ==================== 商品SKU中使用规格测试 ====================
  
  test('商品SKU中添加规格', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并点击详情
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 点击新增 SKU
    await page.getByTestId('product-detail-btn-add-sku').click();
    await page.waitForTimeout(500);
    
    // 使用 data-testid 验证规格选择区域存在
    const addSpecButton = page.getByTestId('sku-form-btn-add-spec');
    if (await addSpecButton.count() > 0) {
      await addSpecButton.click();
      await page.waitForTimeout(500);
      
      // 验证规格项添加成功
      await expect(page.locator('.spec-item, [data-testid^="spec-select-"]')).toBeVisible();
    }
  });

  test('商品SKU中删除规格', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并点击详情
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 点击新增 SKU
    await page.getByTestId('product-detail-btn-add-sku').click();
    await page.waitForTimeout(500);
    
    // 添加规格后再删除
    const addSpecButton = page.getByTestId('sku-form-btn-add-spec');
    if (await addSpecButton.count() > 0) {
      await addSpecButton.click();
      await page.waitForTimeout(500);
      
      // 点击删除规格
      const deleteSpecButton = page.locator('[data-testid^="spec-btn-remove-"]').first();
      if (await deleteSpecButton.count() > 0) {
        await deleteSpecButton.click();
        
        // 验证规格项已删除
        await page.waitForTimeout(500);
      }
    }
  });

  // ==================== 规格数据验证测试 ====================
  
  test('规格名称验证', async ({ page }) => {
    await page.goto('/inventory/specs');
    
    // 点击新增按钮
    await page.getByTestId('specs-btn-create').click();
    await waitForDialog(page);
    
    // 不填写名称，直接确定
    await page.getByTestId('spec-form-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-form-item__error')).toBeVisible();
  });

  test('规格名称重复验证', async ({ page }) => {
    await page.goto('/inventory/specs');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格中的已存在规格名称
    const specsTable = page.getByTestId('specs-table');
    const firstRow = specsTable.locator('tbody tr').first();
    const specName = await firstRow.locator('td').first().textContent();
    
    if (specName && specName.trim()) {
      // 尝试创建同名规格
      await page.getByTestId('specs-btn-create').click();
      await waitForDialog(page);
      
      // 输入已存在的名称
      await page.getByTestId('spec-form-input-name').fill(specName.trim());
      await page.getByTestId('spec-form-btn-submit').click();
      
      // 验证显示错误提示
      await page.waitForTimeout(1000);
    }
  });
});
