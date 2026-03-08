# 🏠 家电销售 ERP 系统

> **100% 由 OpenClaw AI 编写** —— 这是一个完全由 AI 编程助手生成的全栈 ERP 系统

[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?style=flat&logo=vue.js)](https://vuejs.org)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=flat)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat)](https://prisma.io)
[![SQLite](https://img.shields.io/badge/SQLite-003545?style=flat)](https://sqlite.org)

## ✨ 核心特色

本系统最大的亮点在于——**从需求分析到代码实现，每一个字符都是由 OpenClaw AI 编写完成**。

- 🤖 **100% AI 编写**：零人工代码编写，人类仅通过提示词（Prompt Engineering）提供需求和反馈
- 🚀 **完整全栈**：前端 + 后端 + 数据库 + 单元测试 + E2E 测试
- 🎯 **开箱即用**：内置种子数据，快速启动即可体验完整功能

> 这不仅是一个 ERP 系统，更是 AI 编程能力的最佳证明。

## 🛠️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Frontend)                     │
│  Vue 3 + Element Plus + Pinia + Vue Router + Vite       │
└─────────────────────────────────────────────────────────┘
                            │ HTTP REST API
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      后端 (Backend)                      │
│  Express + Prisma ORM + JWT 认证                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      数据库 (Database)                   │
│  SQLite (开发环境)                                       │
└─────────────────────────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3.5 + Composition API |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 构建工具 | Vite 7 |
| 后端框架 | Express 5 |
| ORM | Prisma 5 |
| 数据库 | SQLite |
| 认证 | JWT + bcrypt |
| 测试 | Vitest + Playwright |

## 📦 功能模块

本系统涵盖家电销售企业运营的核心业务模块：

### 🔐 系统管理
- 用户认证与权限管理
- 登录/登出功能
- 密码加密存储

### 📦 产品管理
- 产品信息维护
- 分类管理
- 规格定义
- SKU（库存单位）管理

### 👥 客户管理
- 客户信息录入与维护
- 客户分类与查询

### 💰 销售管理
- 销售订单创建与跟踪
- 销售数据统计

### 📊 库存管理
- 库存实时查询
- 库存预警
- 入库/出库记录

### 💵 财务管理
- 收款记录
- 欠款管理
- 财务统计报表

### 📈 报表中心
- 销售报表
- 库存报表
- 财务报表
- 数据可视化

## 🚀 部署说明

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 启动开发服务器

**后端启动：**

```bash
cd backend
npm run dev
```

后端服务将在 `http://localhost:3000` 启动。

**前端启动：**

```bash
cd frontend
npm run dev
```

前端服务将在 `http://localhost:5173` 启动。

### 数据库初始化

首次启动时，系统会自动创建 SQLite 数据库文件并运行种子数据：

```bash
cd backend
npm run db:push    # 同步数据库结构
npm run db:seed   # 填充种子数据
```

### 端口说明

| 服务 | 端口 |
|------|------|
| 前端 (Vite) | 5173 |
| 后端 (Express) | 3000 |

### 默认账号

系统预置了以下测试账号：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 员工 | user1 | user123 |

## 📁 项目结构

```
erp-system/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── middleware/    # 中间件
│   │   └── app.ts         # 应用入口
│   ├── prisma/
│   │   ├── schema.prisma  # 数据库模型
│   │   └── seed.ts       # 种子数据
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── views/         # 页面视图
│   │   ├── components/   # 组件
│   │   ├── stores/       # Pinia 状态
│   │   ├── api/          # API 调用
│   │   └── router/       # 路由配置
│   └── package.json
└── README.md              # 本文档
```

## 🧪 测试

项目包含完整的测试套件：

```bash
# 后端单元测试
cd backend
npm test

# E2E 测试
cd ../e2e-tests
npm test
```

## 🤝 关于 OpenClaw

**OpenClaw** 是一个 AI 编程助手，能够理解人类的需求描述，并将其转化为完整的、可运行的应用代码。

这个 ERP 系统正是 OpenClaw 能力的最佳展示——从最初的需求 "帮我写一个家电销售的 ERP 系统"，到一个功能完备的全栈应用，每一行代码都凝聚着 AI 的智慧。

---

*Built with 💻 by OpenClaw - 当 AI 遇见编程，一切皆有可能*
