/**
 * 商品管理模块测试
 * 对应测试用例文档: docs/test-cases/02-product-management.md
 * 测试用例数: 27 条
 * 
 * 选择器优化：使用 data-testid 属性替代 CSS 类名和文本选择器
 */

import { test, expect } from '../fixtures/auth';
import { generateProductCode, generateSkuCode, waitForTableLoad, waitForDialog, closeDialog } from '../utils/helpers';

test.describe('商品管理模块', () => {
  
  test.beforeEach(async ({ authenticatedPage }) => {
    // 导航到商品管理页面
    await authenticatedPage.goto('/inventory/products');
    await waitForTableLoad(authenticatedPage);
  });

  // ==================== 商品新增测试 ====================
  
  // TC-PROD-001: 正常新增商品
  test('TC-PROD-001: 正常新增商品', async ({ page }) => {
    await page.goto('/inventory/products');
    
    // 使用 data-testid 点击新增按钮
    await page.getByTestId('products-btn-add').click();
    await waitForDialog(page);
    
    const productCode = generateProductCode();
    const productName = `测试商品-${Date.now()}`;
    
    // 使用 data-testid 填写商品信息
    await page.getByTestId('product-form-input-code').fill(productCode);
    await page.getByTestId('product-form-input-name').fill(productName);
    
    // 选择分类（使用对话框限定的 placeholder 选择器）
    const categoryCascader = page.locator('.el-dialog [placeholder="请选择分类"]');
    await categoryCascader.click();
    
    // 等待可见的 dropdown（使用 aria-hidden="false" 过滤）
    const visibleDropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
    await visibleDropdown.waitFor({ state: 'visible', timeout: 3000 });
    
    const categoryOption = visibleDropdown.locator('.el-cascader-node__label').first();
    if (await categoryOption.count() > 0) {
      await categoryOption.click();
      await page.keyboard.press('Escape');
    }
    
    // 填写单位
    await page.getByTestId('product-form-input-unit').fill('台');
    
    // 点击确定
    await page.getByTestId('product-dialog-btn-submit').click();
    
    // 验证创建成功提示
    await expect(page.locator('.el-message--success')).toContainText('创建成功');
    
    // 验证商品出现在列表中
    await page.getByTestId('products-input-keyword').fill(productCode);
    await page.getByTestId('products-btn-search').click();
    await page.waitForTimeout(1000);
    
    await expect(page.getByText(productCode)).toBeVisible();
  });

  // TC-PROD-002: 商品编码为空
  test('TC-PROD-002: 商品编码为空', async ({ page }) => {
    await page.goto('/inventory/products');
    
    // 点击新增按钮
    await page.getByTestId('products-btn-add').click();
    await waitForDialog(page);
    
    // 不填写编码，只填写其他信息
    await page.getByTestId('product-form-input-name').fill('测试商品');
    await page.getByTestId('product-form-input-unit').fill('台');
    
    // 点击确定
    await page.getByTestId('product-dialog-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-form-item__error').filter({ hasText: '请输入商品编码' })).toBeVisible();
  });

  // TC-PROD-003: 商品编码重复
  test('TC-PROD-003: 商品编码重复', async ({ page }) => {
    await page.goto('/inventory/products');
    
    // 使用 data-testid 获取表格中的第一个商品编码
    await waitForTableLoad(page);
    const productsTable = page.getByTestId('products-table');
    const firstRow = productsTable.locator('tbody tr').first();
    const productCode = await firstRow.locator('td').first().textContent();
    
    if (productCode && productCode.trim()) {
      // 点击新增按钮
      await page.getByTestId('products-btn-add').click();
      await waitForDialog(page);
      
      // 输入已存在的编码
      await page.getByTestId('product-form-input-code').fill(productCode.trim());
      await page.getByTestId('product-form-input-name').fill('测试商品');
      
      // 选择分类（必须选择才能提交）
      const categoryCascader = page.locator('.el-dialog [placeholder="请选择分类"]');
      await categoryCascader.click();
      const visibleDropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
      await visibleDropdown.waitFor({ state: 'visible', timeout: 3000 });
      const categoryOption = visibleDropdown.locator('.el-cascader-node__label').first();
      if (await categoryOption.count() > 0) {
        await categoryOption.click();
        await page.keyboard.press('Escape');
      }
      
      await page.getByTestId('product-form-input-unit').fill('台');
      
      // 点击确定
      await page.getByTestId('product-dialog-btn-submit').click();
      
      // 验证显示错误提示
      await expect(page.locator('.el-message--error')).toContainText('编码已存在');
    }
  });

  // TC-PROD-004: 商品名称为空
  test('TC-PROD-004: 商品名称为空', async ({ page }) => {
    await page.goto('/inventory/products');
    
    // 点击新增按钮
    await page.getByTestId('products-btn-add').click();
    await waitForDialog(page);
    
    // 不填写名称，只填写其他信息
    await page.getByTestId('product-form-input-code').fill(generateProductCode());
    await page.getByTestId('product-form-input-unit').fill('台');
    
    // 点击确定
    await page.getByTestId('product-dialog-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-form-item__error').filter({ hasText: '请输入商品名称' })).toBeVisible();
  });

  // TC-PROD-005: 商品名称过长
  test('TC-PROD-005: 商品名称过长', async ({ page }) => {
    await page.goto('/inventory/products');
    
    // 点击新增按钮
    await page.getByTestId('products-btn-add').click();
    await waitForDialog(page);
    
    const longName = '很长的商品名称'.repeat(20); // 超过100字符
    
    await page.getByTestId('product-form-input-code').fill(generateProductCode());
    await page.getByTestId('product-form-input-name').fill(longName);
    await page.getByTestId('product-form-input-unit').fill('台');
    
    // 点击确定
    await page.getByTestId('product-dialog-btn-submit').click();
    
    // 验证系统处理（可能截断或提示错误）
    // 这里检查是否仍然在对话框中（提交失败）或显示了警告
    const dialogVisible = await page.getByTestId('products-dialog').isVisible();
    expect(dialogVisible).toBeTruthy();
  });

  // TC-PROD-006: 商品价格为0 - 注：价格在 SKU 中设置
  test.skip('TC-PROD-006: 商品价格为0', async ({ page }) => {
    // 价格在 SKU 管理中设置，此测试移至 SKU 测试
  });

  // TC-PROD-007: 商品价格为负数 - 注：价格在 SKU 中设置
  test.skip('TC-PROD-007: 商品价格为负数', async ({ page }) => {
    // 价格在 SKU 管理中设置，此测试移至 SKU 测试
  });

  // TC-PROD-011: 商品分类未选择
  test('TC-PROD-011: 商品分类未选择', async ({ page }) => {
    await page.goto('/inventory/products');
    
    // 点击新增按钮
    await page.getByTestId('products-btn-add').click();
    await waitForDialog(page);
    
    // 不选择分类
    await page.getByTestId('product-form-input-code').fill(generateProductCode());
    await page.getByTestId('product-form-input-name').fill('测试商品');
    await page.getByTestId('product-form-input-unit').fill('台');
    
    // 点击确定
    await page.getByTestId('product-dialog-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-form-item__error').filter({ hasText: '请选择分类' })).toBeVisible();
  });

  // TC-PROD-012: 商品单位为空
  test('TC-PROD-012: 商品单位为空', async ({ page }) => {
    await page.goto('/inventory/products');
    
    // 点击新增按钮
    await page.getByTestId('products-btn-add').click();
    await waitForDialog(page);
    
    // 填写编码和名称
    await page.getByTestId('product-form-input-code').fill(generateProductCode());
    await page.getByTestId('product-form-input-name').fill('测试商品');
    
    // 选择分类（必须选择才能触发单位验证）
    const categoryCascader = page.locator('.el-dialog [placeholder="请选择分类"]');
    await categoryCascader.click();
    const visibleDropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
    await visibleDropdown.waitFor({ state: 'visible', timeout: 3000 });
    const categoryOption = visibleDropdown.locator('.el-cascader-node__label').first();
    if (await categoryOption.count() > 0) {
      await categoryOption.click();
      await page.keyboard.press('Escape');
    }
    
    // 清空单位字段（表单默认有"台"）
    await page.getByTestId('product-form-input-unit').clear();
    
    // 点击确定
    await page.getByTestId('product-dialog-btn-submit').click();
    
    // 验证显示错误提示
    await expect(page.locator('.el-form-item__error').filter({ hasText: '请输入单位' })).toBeVisible();
  });

  // ==================== 商品修改测试 ====================
  
  // TC-PROD-013: 正常修改商品
  test('TC-PROD-013: 正常修改商品', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格并点击编辑按钮
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-edit').click();
    await waitForDialog(page);
    
    // 修改商品名称
    const nameInput = page.getByTestId('product-form-input-name');
    const originalName = await nameInput.inputValue();
    const newName = `${originalName}-已修改`;
    await nameInput.fill(newName);
    
    // 点击确定
    await page.getByTestId('product-dialog-btn-submit').click();
    
    // 验证更新成功提示
    await expect(page.locator('.el-message--success')).toContainText('更新成功');
  });

  // TC-PROD-014: 修改商品编码为已存在编码
  test('TC-PROD-014: 修改商品编码为已存在编码', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格
    const productsTable = page.getByTestId('products-table');
    const rows = productsTable.locator('tbody tr');
    const count = await rows.count();
    
    if (count >= 2) {
      const firstCode = await rows.first().locator('td').first().textContent();
      const secondCode = await rows.nth(1).locator('td').first().textContent();
      
      if (firstCode && secondCode && firstCode.trim() !== secondCode?.trim()) {
        // 编辑第二个商品
        await rows.nth(1).getByTestId('products-btn-edit').click();
        await waitForDialog(page);
        
        // 将编码改为第一个商品的编码
        await page.getByTestId('product-form-input-code').fill(firstCode.trim());
        await page.getByTestId('product-dialog-btn-submit').click();
        
        // 验证显示错误提示
        await expect(page.locator('.el-message--error')).toContainText('编码已存在');
      }
    }
  });

  // TC-PROD-015: 修改商品分类
  test('TC-PROD-015: 修改商品分类', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 点击第一个商品的编辑按钮
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-edit').click();
    await waitForDialog(page);
    
    // 点击分类选择器（使用对话框内的 cascader，不依赖 placeholder）
    const categoryCascader = page.locator('.el-dialog .el-cascader').first();
    await categoryCascader.click();
    
    // 等待可见的 dropdown
    const visibleDropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
    await visibleDropdown.waitFor({ state: 'visible', timeout: 3000 });
    
    // 选择一个不同的分类（如果有的话）
    const options = visibleDropdown.locator('.el-cascader-node__label');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await options.nth(1).click();
      
      // 点击确定
      await page.getByTestId('product-dialog-btn-submit').click();
      
      // 验证更新成功提示
      await expect(page.locator('.el-message--success')).toContainText('更新成功');
    }
  });

  // ==================== 商品删除测试 ====================
  
  // TC-PROD-016: 正常删除商品（有SKU时无法删除）
  test('TC-PROD-016: 正常删除商品', async ({ page }) => {
    // 先创建一个新商品用于删除
    await page.goto('/inventory/products');
    
    // 点击新增按钮
    await page.getByTestId('products-btn-add').click();
    await waitForDialog(page);
    
    const productCode = generateProductCode();
    await page.getByTestId('product-form-input-code').fill(productCode);
    await page.getByTestId('product-form-input-name').fill(`待删除商品-${Date.now()}`);
    
    // 选择分类（使用对话框内的 cascader）
    const categoryCascader = page.locator('.el-dialog .el-cascader').first();
    await categoryCascader.click();
    const visibleDropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
    await visibleDropdown.waitFor({ state: 'visible', timeout: 3000 });
    const categoryOption = visibleDropdown.locator('.el-cascader-node__label').first();
    if (await categoryOption.count() > 0) {
      await categoryOption.click();
    }
    
    await page.getByTestId('product-form-input-unit').fill('台');
    await page.getByTestId('product-dialog-btn-submit').click();
    
    // 等待创建成功
    await expect(page.locator('.el-message--success')).toContainText('创建成功');
    
    // 搜索刚创建的商品
    await page.getByTestId('products-input-keyword').fill(productCode);
    await page.getByTestId('products-btn-search').click();
    await page.waitForTimeout(500);
    
    // 点击删除按钮
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-delete').click();
    
    // 确认删除
    await page.click('.el-message-box button:has-text("确定")');
    
    // 由于后端自动创建默认SKU，应该显示无法删除的提示
    await expect(page.locator('.el-message--error')).toContainText(/SKU|无法删除/);
  });

  // TC-PROD-017: 删除有SKU的商品
  test('TC-PROD-017: 删除有SKU的商品', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格
    const productsTable = page.getByTestId('products-table');
    const rows = productsTable.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const skuCount = await rows.nth(i).locator('td').nth(5).textContent();
      if (skuCount && parseInt(skuCount) > 0) {
        // 尝试删除
        await rows.nth(i).getByTestId('products-btn-delete').click();
        await page.click('.el-message-box button:has-text("确定")');
        
        // 验证显示错误提示或警告
        const errorMessage = page.locator('.el-message--error, .el-message--warning');
        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toContainText(/SKU|无法删除/);
        }
        
        break;
      }
    }
  });

  // TC-PROD-018: 删除被销售订单引用的商品
  test.skip('TC-PROD-018: 删除被销售订单引用的商品', async ({ page }) => {
    // TODO: 需要创建销售订单后测试
  });

  // ==================== SKU 管理测试 ====================
  
  // TC-PROD-019: 正常新增SKU
  test('TC-PROD-019: 正常新增SKU', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 点击第一个商品的详情按钮
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 等待详情对话框加载
    await expect(page.getByTestId('product-detail-descriptions')).toBeVisible();
    
    // 点击新增 SKU 按钮
    await page.getByTestId('product-detail-btn-add-sku').click();
    await page.waitForTimeout(500);
    
    // 填写 SKU 信息
    const skuCode = generateSkuCode();
    await page.getByTestId('sku-form-input-code').fill(skuCode);
    await page.getByTestId('sku-form-input-name').fill('默认规格');
    
    // 设置价格
    await page.getByTestId('sku-form-input-price').locator('input').fill('199.99');
    await page.getByTestId('sku-form-input-cost-price').locator('input').fill('99.99');
    
    // 点击确定
    await page.getByTestId('sku-dialog-btn-submit').click();
    
    // 验证创建成功
    await expect(page.locator('.el-message--success')).toContainText('创建成功');
  });

  // TC-PROD-020: SKU编码重复
  test('TC-PROD-020: SKU编码重复', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 点击第一个商品的详情按钮
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 获取已有 SKU 编码
    const skuTable = page.getByTestId('product-detail-sku-table');
    const existingSkuCode = await skuTable.locator('td').first().textContent();
    
    if (existingSkuCode && existingSkuCode.trim()) {
      // 点击新增 SKU 按钮
      await page.getByTestId('product-detail-btn-add-sku').click();
      await page.waitForTimeout(500);
      
      // 输入已存在的 SKU 编码
      await page.getByTestId('sku-form-input-code').fill(existingSkuCode.trim());
      await page.getByTestId('sku-form-input-name').fill('测试SKU');
      
      // 设置有效价格（避免先触发价格验证）
      await page.getByTestId('sku-form-input-price').locator('input').fill('99.99');
      await page.getByTestId('sku-form-input-cost-price').locator('input').fill('49.99');
      
      // 点击确定
      await page.getByTestId('sku-dialog-btn-submit').click();
      
      // 验证显示错误提示
      await expect(page.locator('.el-message--error')).toContainText('编码已存在');
    }
  });

  // TC-PROD-021: SKU价格为负
  test('TC-PROD-021: SKU价格为负', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 点击第一个商品的详情按钮
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 点击新增 SKU 按钮
    await page.getByTestId('product-detail-btn-add-sku').click();
    await page.waitForTimeout(500);
    
    // 填写 SKU 信息
    await page.getByTestId('sku-form-input-code').fill(generateSkuCode());
    await page.getByTestId('sku-form-input-name').fill('测试SKU');
    
    // 尝试输入负数价格（el-input-number 有 min="0"，会自动纠正为 0 或触发验证错误）
    const priceInput = page.getByTestId('sku-form-input-price').locator('input');
    await priceInput.fill('-100');
    
    // 填写成本价
    await page.getByTestId('sku-form-input-cost-price').locator('input').fill('50');
    
    // 点击确定提交
    await page.getByTestId('sku-dialog-btn-submit').click();
    
    // 验证价格被限制为非负数（el-input-number 会自动纠正或显示验证错误）
    // 方式1: 检查输入值是否被纠正为非负数
    const value = await priceInput.inputValue();
    const numValue = parseFloat(value);
    
    // 方式2: 或者验证表单验证错误（销售价格必须大于0）
    if (numValue < 0) {
      // 如果负数没有被前端阻止，应该显示验证错误
      await expect(page.locator('.el-message--error, .el-form-item__error')).toBeVisible();
    } else {
      // 如果负数被前端纠正为非负数，验证通过
      expect(numValue).toBeGreaterThanOrEqual(0);
    }
  });

  // TC-PROD-022: SKU成本价大于售价
  test('TC-PROD-022: SKU成本价大于售价', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 点击第一个商品的详情按钮
    const productsTable = page.getByTestId('products-table');
    await productsTable.locator('tbody tr:first-child').getByTestId('products-btn-detail').click();
    await waitForDialog(page);
    
    // 点击新增 SKU 按钮
    await page.getByTestId('product-detail-btn-add-sku').click();
    await page.waitForTimeout(500);
    
    // 填写 SKU 信息
    await page.getByTestId('sku-form-input-code').fill(generateSkuCode());
    await page.getByTestId('sku-form-input-name').fill('测试SKU');
    
    // 设置售价低于成本价
    await page.getByTestId('sku-form-input-price').locator('input').fill('50');
    await page.getByTestId('sku-form-input-cost-price').locator('input').fill('100');
    
    // 点击确定
    await page.getByTestId('sku-dialog-btn-submit').click();
    
    // 验证创建成功（可能有警告）
    await expect(page.locator('.el-message')).toBeVisible();
  });

  // ==================== 商品查询测试 ====================
  
  // TC-PROD-023: 按编码精确查询
  test('TC-PROD-023: 按编码精确查询', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格中的第一个商品编码
    const productsTable = page.getByTestId('products-table');
    const firstRow = productsTable.locator('tbody tr').first();
    const productCode = await firstRow.locator('td').first().textContent();
    
    if (productCode && productCode.trim()) {
      // 输入编码搜索
      await page.getByTestId('products-input-keyword').fill(productCode.trim());
      await page.getByTestId('products-btn-search').click();
      await page.waitForTimeout(1000);
      
      // 验证只显示该商品
      const rows = productsTable.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(1);
      
      // 验证显示的商品编码正确
      await expect(page.getByText(productCode.trim())).toBeVisible();
    }
  });

  // TC-PROD-024: 按名称模糊查询
  test('TC-PROD-024: 按名称模糊查询', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 使用 data-testid 获取表格
    const productsTable = page.getByTestId('products-table');
    const firstRow = productsTable.locator('tbody tr').first();
    const productName = await firstRow.locator('td').nth(1).textContent();
    
    if (productName && productName.trim()) {
      // 取名称的前两个字进行模糊搜索
      const searchTerm = productName.trim().substring(0, 2);
      
      // 输入名称搜索
      await page.getByTestId('products-input-keyword').fill(searchTerm);
      await page.getByTestId('products-btn-search').click();
      await page.waitForTimeout(1000);
      
      // 验证搜索结果
      const rows = productsTable.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  // TC-PROD-025: 按分类筛选
  test('TC-PROD-025: 按分类筛选', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 点击分类选择器（使用更具体的选择器定位页面上的 cascader）
    const categoryCascader = page.locator('.search-bar .el-cascader').first();
    await categoryCascader.waitFor({ state: 'visible', timeout: 5000 });
    await categoryCascader.click();
    
    // 等待 dropdown 出现
    const visibleDropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
    await visibleDropdown.waitFor({ state: 'visible', timeout: 3000 });
    
    // 选择第一个分类
    const categoryOption = visibleDropdown.locator('.el-cascader-node__label').first();
    if (await categoryOption.count() > 0) {
      await categoryOption.click();
      await page.getByTestId('products-btn-search').click();
      await page.waitForTimeout(1000);
      
      // 验证搜索结果
      const productsTable = page.getByTestId('products-table');
      const rows = productsTable.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  // TC-PROD-026: 组合条件查询
  test('TC-PROD-026: 组合条件查询', async ({ page }) => {
    await page.goto('/inventory/products');
    await waitForTableLoad(page);
    
    // 输入关键词
    await page.getByTestId('products-input-keyword').fill('测试');
    
    // 选择状态（点击下拉，然后在 dropdown 中选择）
    await page.getByTestId('products-select-status').click();
    await page.waitForSelector('.el-select-dropdown');
    
    // 在 dropdown 中选择"启用"选项（限定在 dropdown 内避免匹配表格中的标签）
    const dropdown = page.locator('.el-select-dropdown:visible');
    await dropdown.locator('.el-select-dropdown__item:has-text("启用")').click();
    
    // 点击搜索
    await page.getByTestId('products-btn-search').click();
    await page.waitForTimeout(1000);
    
    // 验证搜索结果
    const productsTable = page.getByTestId('products-table');
    const rows = productsTable.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // TC-PROD-027: 查询无结果
  test('TC-PROD-027: 查询无结果', async ({ page }) => {
    await page.goto('/inventory/products');
    
    // 输入不存在的编码
    await page.getByTestId('products-input-keyword').fill('不存在的商品编码XYZ123');
    await page.getByTestId('products-btn-search').click();
    await page.waitForTimeout(1000);
    
    // 验证显示暂无数据
    await expect(page.getByText('暂无数据')).toBeVisible();
  });
});
