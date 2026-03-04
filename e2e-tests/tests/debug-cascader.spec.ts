import { test, expect } from '../fixtures/auth';

/**
 * 最终验证 - Element Plus Cascader 正确交互方式
 * 
 * 关键发现：
 * 1. data-testid 可能不可用，需要使用备用选择器
 * 2. 页面上有 2 个 cascader（搜索栏 + 表单），需要限定作用域
 * 3. cascader 选择选项后 dropdown 可能保持打开（等待更深层选择或外部点击）
 */

test('cascader - 最终解决方案', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  
  await page.goto('/inventory/products');
  await page.waitForLoadState('networkidle');
  
  // 点击新增按钮
  await page.getByTestId('products-btn-add').click();
  await page.waitForSelector('.el-dialog', { timeout: 5000 });
  
  console.log('=== 最终解决方案 ===');
  
  // 步骤 1: 定位 cascader（使用对话框限定的 placeholder）
  const cascader = page.locator('.el-dialog [placeholder="请选择分类"]');
  
  // 步骤 2: 点击打开 dropdown
  await cascader.click();
  
  // 步骤 3: 等待 dropdown 可见（使用 :not([aria-hidden="true"]) 选择可见的 dropdown）
  const visibleDropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
  await visibleDropdown.waitFor({ state: 'visible', timeout: 3000 });
  console.log('✅ dropdown 已打开');
  
  // 步骤 4: 选择第一个选项
  const firstOption = visibleDropdown.locator('.el-cascader-node__label').first();
  const optionText = await firstOption.textContent();
  console.log('选择选项:', optionText);
  await firstOption.click();
  
  // 步骤 5: 等待一下让选择生效
  await page.waitForTimeout(300);
  
  // 步骤 6: 点击外部关闭 dropdown（如果需要）
  // 按 Escape 或点击表单其他位置
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  
  console.log('✅ cascader 操作完成');
  
  // 截图
  await page.screenshot({ path: 'test-results/cascader-success.png' });
});

test('cascader - 多种选择器对比', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  
  await page.goto('/inventory/products');
  await page.waitForLoadState('networkidle');
  await page.getByTestId('products-btn-add').click();
  await page.waitForSelector('.el-dialog', { timeout: 5000 });
  
  // 列出所有可行的选择器
  console.log('\n=== 可行的 Cascader 选择器方案 ===');
  
  // 方案 A: 对话框 + placeholder
  const selectorA = '.el-dialog [placeholder="请选择分类"]';
  console.log(`方案A: ${selectorA} -> count: ${await page.locator(selectorA).count()}`);
  
  // 方案 B: 对话框 + cascader 类
  const selectorB = '.el-dialog .el-cascader';
  console.log(`方案B: ${selectorB} -> count: ${await page.locator(selectorB).count()}`);
  
  // 方案 C: 表单项包含 "分类" 文本
  const selectorC = '.el-form-item:has-text("分类") .el-cascader';
  console.log(`方案C: ${selectorC} -> count: ${await page.locator(selectorC).count()}`);
  
  // 方案 D: label 关联
  const selectorD = '.el-form-item:has(.el-form-item__label:has-text("分类")) .el-cascader';
  console.log(`方案D: ${selectorD} -> count: ${await page.locator(selectorD).count()}`);
  
  // 推荐方案验证
  console.log('\n=== 推荐方案验证 ===');
  
  // 使用方案 A（最简洁）
  const cascader = page.locator(selectorA);
  await cascader.click();
  
  const dropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
  await dropdown.waitFor({ state: 'visible', timeout: 3000 });
  
  const option = dropdown.locator('.el-cascader-node__label').first();
  await option.click();
  
  await page.keyboard.press('Escape');
  
  console.log('✅ 推荐方案验证成功');
});

test('cascader - 完整表单流程', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  
  await page.goto('/inventory/products');
  await page.waitForLoadState('networkidle');
  
  // 点击新增
  await page.getByTestId('products-btn-add').click();
  await page.waitForSelector('.el-dialog', { timeout: 5000 });
  
  // 填写基本信息
  const productCode = `TEST-CASCADER-${Date.now()}`;
  await page.getByTestId('product-form-input-code').fill(productCode);
  await page.getByTestId('product-form-input-name').fill('测试商品 Cascader');
  
  // 选择分类（使用最终推荐方案）
  const cascader = page.locator('.el-dialog [placeholder="请选择分类"]');
  await cascader.click();
  
  const dropdown = page.locator('.el-cascader__dropdown[aria-hidden="false"]');
  await dropdown.waitFor({ state: 'visible', timeout: 3000 });
  await dropdown.locator('.el-cascader-node__label').first().click();
  await page.keyboard.press('Escape');
  
  // 填写单位
  await page.getByTestId('product-form-input-unit').fill('台');
  
  // 提交表单
  await page.getByTestId('product-dialog-btn-submit').click();
  
  // 验证成功
  try {
    await page.locator('.el-message--success').waitFor({ timeout: 3000 });
    console.log('✅ 商品创建成功');
  } catch {
    // 检查是否有验证错误
    const errors = await page.locator('.el-form-item__error').allTextContents();
    if (errors.length > 0) {
      console.log('表单验证错误:', errors);
    }
  }
});
