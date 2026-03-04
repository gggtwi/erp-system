# E2E 测试修复实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 E2E 测试，将通过率从 46% 提升至 85%+

**Architecture:** 按优先级分模块修复，P0 销售开单 → P1 客户管理 → P1 规格管理 → P3 财务/库存

**Tech Stack:** Vue 3 + Element Plus + Playwright + TypeScript

---

## 问题根本原因分析

### P0: 销售开单 (10 失败)
- **核心问题**: `addProductToCart` 函数选择器不稳定
- 添加按钮选择器 `button:has-text("添加")` 不可靠
- 商品可能库存为 0 导致添加失败
- 购物车验证逻辑缺失

### P1: 客户管理 (5 失败)
- **根本原因**: 前端组件缺少 `data-testid` 属性
- `customer-btn-create`, `customer-form-input-name`, `customer-btn-detail`, `customer-btn-edit`, `customer-tab-history`

### P1: 规格管理 (4 失败)
- **根本原因**: 前端组件缺少 `data-testid` 属性
- `specs-btn-create`, `specs-table`, `spec-form-input-name`, `specs-btn-edit`

### P3: 库存管理 (1 失败)
- `.el-tag` 选择器匹配多元素，需用 `.filter({ hasText })`

---

## Task 1: 修复销售开单测试 (P0)

**Files:**
- Modify: `/home/cxin/.openclaw/workspace-worker1/erp-system/e2e-tests/tests/sales.spec.ts`
- Modify: `/home/cxin/.openclaw/workspace-worker1/erp-system/frontend/src/views/sales/create.vue`

**Step 1: 分析现有商品数据是否有库存**

Run: 
```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system/backend && npx prisma studio --port 5555 &
cd /home/cxin/.openclaw/workspace-worker1/erp-system/backend && sqlite3 prisma/dev.db "SELECT p.name, s.name as sku_name, i.quantity FROM Product p JOIN SKU s ON s.productId = p.id LEFT JOIN Inventory i ON i.skuId = s.id LIMIT 10;"
```
Expected: 查看商品和库存数据

**Step 2: 修改测试中的 addProductToCart 函数**

修改 `e2e-tests/tests/sales.spec.ts` 中的辅助函数：

```typescript
async function addProductToCart(page: any) {
  // 等待商品列表加载
  await page.waitForSelector('[data-testid="sales-create-product-table"]');
  
  const productTable = page.getByTestId('sales-create-product-table');
  const rows = productTable.locator('tbody tr');
  const rowCount = await rows.count();
  
  // 找到有库存的商品并添加
  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const stockText = await row.locator('td').nth(4).textContent();
    const stock = parseInt(stockText || '0');
    
    if (stock > 0) {
      // 使用动态 data-testid 或文本选择器
      const addButton = row.locator('button:has-text("添加")');
      await addButton.click();
      
      // 等待添加成功的消息或购物车更新
      await page.waitForTimeout(300);
      
      // 验证购物车有商品
      const cartTable = page.getByTestId('sales-create-cart-table');
      const cartItems = cartTable.locator('tbody tr');
      const cartCount = await cartItems.count();
      
      if (cartCount > 0) {
        return; // 成功添加
      }
    }
  }
  
  throw new Error('没有找到有库存的商品');
}
```

**Step 3: 运行销售开单模块测试验证**

Run:
```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system/e2e-tests && npx playwright test tests/sales.spec.ts --reporter=list 2>&1 | head -100
```
Expected: 通过率提升

**Step 4: Commit**

```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system && git add e2e-tests/tests/sales.spec.ts && git commit -m "fix: 修复销售开单测试 addProductToCart 函数"
```

---

## Task 2: 修复客户管理测试 (P1)

**Files:**
- Modify: `/home/cxin/.openclaw/workspace-worker1/erp-system/frontend/src/views/customer/index.vue`
- Modify: `/home/cxin/.openclaw/workspace-worker1/erp-system/frontend/src/views/customer/detail.vue`

**Step 1: 为客户列表页添加 data-testid**

在 `frontend/src/views/customer/index.vue` 中：
- 表格添加 `data-testid="customer-table"`
- 新增按钮添加 `data-testid="customer-btn-create"`
- 编辑按钮添加 `data-testid="customer-btn-edit"`
- 详情按钮添加 `data-testid="customer-btn-detail"`
- 搜索输入框添加 `data-testid="customer-input-keyword"`
- 搜索按钮添加 `data-testid="customer-btn-search"`
- 新增对话框输入框添加 `data-testid="customer-form-input-name"` 等

**Step 2: 为客户详情页添加 data-testid**

在 `frontend/src/views/customer/detail.vue` 中：
- 历史标签添加 `data-testid="customer-tab-history"`
- 欠款标签添加 `data-testid="customer-tab-debt"`
- 历史表格添加 `data-testid="customer-history-table"`

**Step 3: 运行客户管理测试验证**

Run:
```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system/e2e-tests && npx playwright test tests/customers.spec.ts --reporter=list 2>&1 | head -80
```

**Step 4: Commit**

```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system && git add frontend/src/views/customer/ && git commit -m "fix: 为客户管理页面添加 data-testid 属性"
```

---

## Task 3: 修复规格管理测试 (P1)

**Files:**
- Modify: `/home/cxin/.openclaw/workspace-worker1/erp-system/frontend/src/views/inventory/Specs.vue` (或对应文件)

**Step 1: 查找规格管理页面文件**

Run:
```bash
find /home/cxin/.openclaw/workspace-worker1/erp-system/frontend/src -name "*.vue" | xargs grep -l "规格" | head -5
```

**Step 2: 为规格管理页面添加 data-testid**

添加以下属性：
- 表格: `data-testid="specs-table"`
- 新增按钮: `data-testid="specs-btn-create"`
- 编辑按钮: `data-testid="specs-btn-edit"`
- 删除按钮: `data-testid="specs-btn-delete"`
- 表单名称输入: `data-testid="spec-form-input-name"`
- 表单值输入: `data-testid="spec-form-input-values"`
- 表单提交按钮: `data-testid="spec-form-btn-submit"`

**Step 3: 运行规格管理测试验证**

Run:
```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system/e2e-tests && npx playwright test tests/specs.spec.ts --reporter=list 2>&1 | head -80
```

**Step 4: Commit**

```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system && git add frontend/src/views/inventory/ && git commit -m "fix: 为规格管理页面添加 data-testid 属性"
```

---

## Task 4: 修复库存管理测试 (P3)

**Files:**
- Modify: `/home/cxin/.openclaw/workspace-worker1/erp-system/e2e-tests/tests/inventory.spec.ts`

**Step 1: 修复 .el-tag 多元素匹配问题**

找到 TC-INV-015 相关测试，修改选择器：

```typescript
// 修复前
await page.locator('.el-tag').click();

// 修复后
await page.locator('.el-tag').filter({ hasText: '特定文本' }).click();
// 或者使用更精确的选择器
await page.locator('.el-tag--danger, .el-tag--warning').first().click();
```

**Step 2: 运行库存管理测试验证**

Run:
```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system/e2e-tests && npx playwright test tests/inventory.spec.ts --reporter=list 2>&1 | head -80
```

**Step 3: Commit**

```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system && git add e2e-tests/tests/inventory.spec.ts && git commit -m "fix: 修复库存管理测试选择器多元素匹配问题"
```

---

## Task 5: 运行全量测试验证

**Step 1: 运行所有 E2E 测试**

Run:
```bash
cd /home/cxin/.openclaw/workspace-worker1/erp-system/e2e-tests && npx playwright test --reporter=list 2>&1 | tail -50
```

**Step 2: 统计通过率**

统计各模块通过率，确认达到 85%+ 目标。

---

## 执行策略

**自动模式**: 使用 subagent-driven-development，并行执行独立任务

| Task | 依赖 | 分配 |
|------|------|------|
| Task 1: 销售开单 | 无 | task-worker-1 |
| Task 2: 客户管理 | 无 | task-worker-2 |
| Task 3: 规格管理 | 无 | task-worker-1 (队列) |
| Task 4: 库存管理 | 无 | task-worker-2 (队列) |
| Task 5: 全量验证 | Task 1-4 | main |

---

## 预期结果

| 模块 | 当前 | 目标 |
|------|------|------|
| 销售开单 | 52% | 85%+ |
| 客户管理 | 62% | 90%+ |
| 规格管理 | 56% | 90%+ |
| 库存管理 | 94% | 100% |
| **总体** | **46%** | **85%+** |
