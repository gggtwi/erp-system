# ERP 系统 E2E 测试项目

🫧 使用 Playwright + TypeScript 构建的 ERP 系统端到端测试套件

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 安装浏览器

```bash
npx playwright install chromium
```

### 3. 启动前后端服务

确保 ERP 系统前后端服务正在运行：
- 前端: http://localhost:5173
- 后端: http://localhost:3000

### 4. 运行测试

```bash
# 运行所有测试
npm test

# 运行指定模块
npm run test:login
npm run test:products
npm run test:inventory
npm run test:sales
npm run test:finance
npm run test:customers

# 查看测试报告
npm run report
```

## 测试账号

- **管理员**: admin / admin123

## 项目结构

```
e2e-tests/
├── playwright.config.ts      # Playwright 配置
├── tsconfig.json             # TypeScript 配置
├── package.json              # 项目配置
├── TEST_REPORT.md            # 测试报告
├── tests/                    # 测试文件
│   ├── login.spec.ts         # 登录认证测试
│   ├── products.spec.ts      # 商品管理测试
│   ├── inventory.spec.ts     # 库存管理测试
│   ├── sales.spec.ts         # 销售开单测试
│   ├── finance.spec.ts       # 财务管理测试
│   ├── reports.spec.ts       # 报表分析测试
│   ├── customers.spec.ts     # 客户管理测试
│   └── specs.spec.ts         # 规格管理测试
├── fixtures/                 # 测试 Fixtures
│   └── auth.ts               # 登录认证 fixture
└── utils/                    # 工具函数
    └── helpers.ts            # 通用辅助函数
```

## 测试模块说明

### 1. 登录认证模块 (login.spec.ts)
- 正常登录流程测试
- 输入验证测试
- 边界值测试
- 安全测试（SQL注入、XSS）
- 权限控制测试

### 2. 商品管理模块 (products.spec.ts)
- 商品新增测试
- 商品修改测试
- 商品删除测试
- SKU 管理测试
- 商品查询测试

### 3. 库存管理模块 (inventory.spec.ts)
- 库存概览测试
- 库存调整测试
- 库存流水测试
- 库存统计测试

### 4. 销售开单模块 (sales.spec.ts)
- 正交试验法设计
- 完整销售流程测试
- 输入验证测试
- 并发和异常测试

### 5. 财务管理模块 (finance.spec.ts)
- 应收账款查询测试
- 收款核销测试
- 数据一致性测试

### 6. 报表分析模块 (reports.spec.ts)
- 销售报表测试
- 库存报表测试
- 财务报表测试
- 报表准确性测试

### 7. 客户管理模块 (customers.spec.ts)
- 客户列表测试
- 客户新增/编辑/删除测试
- 客户欠款查看测试

### 8. 规格管理模块 (specs.spec.ts)
- 规格类型管理测试
- 规格值管理测试
- SKU 中规格使用测试

## 编写测试用例

### 基本模板

```typescript
import { test, expect } from '../fixtures/auth';

test.describe('模块名称', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // 测试前准备
  });

  test('TC-XXX: 测试用例名称', async ({ page }) => {
    // 测试步骤
    await page.goto('/path');
    
    // 断言
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### 使用 Fixture

```typescript
// 已认证的页面
test('需要登录的测试', async ({ authenticatedPage }) => {
  // authenticatedPage 已经登录完成
  await authenticatedPage.goto('/inventory/products');
});

// 手动登录
import { login } from '../fixtures/auth';

test('手动登录测试', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  // 后续操作...
});
```

### 使用工具函数

```typescript
import { 
  waitForTableLoad, 
  waitForDialog,
  generateProductCode,
  randomName,
  randomPhone
} from '../utils/helpers';

test('使用工具函数', async ({ page }) => {
  await waitForTableLoad(page);
  await waitForDialog(page);
  
  const code = generateProductCode();
  const name = randomName();
  const phone = randomPhone();
});
```

## 调试技巧

### 1. 使用 UI 模式

```bash
npm run test:ui
```

### 2. 使用调试模式

```bash
npm run test:debug
```

### 3. 查看测试追踪

```typescript
// 在 playwright.config.ts 中启用
use: {
  trace: 'on',  // 总是记录追踪
}
```

### 4. 使用 codegen 生成测试

```bash
npm run codegen
```

## 最佳实践

1. **使用 data-testid**: 为关键元素添加 `data-testid` 属性
2. **避免硬编码等待**: 使用 `waitForSelector` 替代 `waitForTimeout`
3. **保持测试独立**: 每个测试应该独立运行，不依赖其他测试
4. **使用 Page Object Model**: 对于复杂页面，可以封装为 Page Object
5. **清理测试数据**: 测试后清理创建的测试数据

## 常见问题

### Q: 测试超时怎么办？

A: 调整 `playwright.config.ts` 中的超时设置，或优化等待策略

### Q: 元素找不到怎么办？

A: 检查选择器是否正确，使用 `page.pause()` 调试，或使用 codegen 生成正确的选择器

### Q: 如何处理动态内容？

A: 使用 `waitForSelector` 等待元素出现，或使用 `waitForLoadState('networkidle')`

---

**泡泡** 🫧  
*测试工程师*
