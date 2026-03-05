# ERP Mobile App - Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建 uni-app 项目骨架，实现用户认证和首页功能

**Architecture:** uni-app + Vue 3 + Pinia + uView UI，复用现有 ERP 后端 API

**Tech Stack:** 
- 框架: uni-app + Vue 3
- UI: uView UI 3.0
- 状态管理: Pinia
- 测试: Vitest + Appium
- 后端: 现有 ERP API (Node.js + Express)

---

## Task 1: 项目初始化

**Files:**
- Create: `erp-mobile/` (项目根目录)

**Step 1: 创建 uni-app 项目**

```bash
# 使用 HBuilderX CLI 或 Vue CLI 创建项目
npx degit dcloudio/uni-preset-vue#vite-ts erp-mobile
cd erp-mobile
```

**Step 2: 安装依赖**

```bash
npm install
npm install pinia @vueuse/core
npm install @dcloudio/uni-ui
npm install -D vitest @vue/test-utils jsdom @vitest/coverage-v8
```

**Step 3: 配置 Pinia**

创建 `src/stores/index.ts`:
```typescript
import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia
```

修改 `src/main.ts`:
```typescript
import { createSSRApp } from 'vue'
import App from './App.vue'
import pinia from './stores'

export function createApp() {
  const app = createSSRApp(App)
  app.use(pinia)
  return { app }
}
```

**Step 4: 配置 Vitest**

创建 `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

**Step 5: 验证项目结构**

```bash
npm run dev:h5
# 访问 http://localhost:5173 确认项目运行
```

**Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: 初始化 uni-app 项目，配置 Pinia 和 Vitest"
```

---

## Task 2: API 请求封装

**Files:**
- Create: `src/utils/request.ts`
- Create: `src/api/index.ts`
- Create: `tests/utils/request.test.ts`

**Step 1: 写失败的测试**

创建 `tests/utils/request.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock uni.request
const mockRequest = vi.fn()
global.uni = {
  request: mockRequest
} as any

describe('Request Utils', () => {
  beforeEach(() => {
    mockRequest.mockClear()
  })

  it('should make GET request successfully', async () => {
    mockRequest.mockImplementation((options: any) => {
      options.success({ data: { code: 0, data: { id: 1 } }, statusCode: 200 })
    })

    const { request } = await import('../../src/utils/request')
    const result = await request({ url: '/api/test', method: 'GET' })
    
    expect(result).toEqual({ id: 1 })
  })

  it('should add token to header', async () => {
    mockRequest.mockImplementation((options: any) => {
      expect(options.header.Authorization).toBe('Bearer test-token')
      options.success({ data: { code: 0, data: {} }, statusCode: 200 })
    })

    const { setToken, request } = await import('../../src/utils/request')
    setToken('test-token')
    await request({ url: '/api/test', method: 'GET' })
  })

  it('should handle error response', async () => {
    mockRequest.mockImplementation((options: any) => {
      options.success({ data: { code: 401, message: '未授权' }, statusCode: 200 })
    })

    const { request } = await import('../../src/utils/request')
    await expect(request({ url: '/api/test', method: 'GET' }))
      .rejects.toThrow('未授权')
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm test tests/utils/request.test.ts
# Expected: FAIL (module not found)
```

**Step 3: 实现最小代码**

创建 `src/utils/request.ts`:
```typescript
const BASE_URL = 'http://192.168.31.243:3000/api'
let token: string | null = null

export function setToken(newToken: string | null) {
  token = newToken
  if (newToken) {
    uni.setStorageSync('token', newToken)
  } else {
    uni.removeStorageSync('token')
  }
}

export function getToken(): string | null {
  if (!token) {
    token = uni.getStorageSync('token') || null
  }
  return token
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const header: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.header
    }

    const currentToken = getToken()
    if (currentToken) {
      header.Authorization = `Bearer ${currentToken}`
    }

    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res) => {
        const data = res.data as any
        if (data.code === 0) {
          resolve(data.data)
        } else if (data.code === 401) {
          setToken(null)
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error(data.message || '登录已过期'))
        } else {
          reject(new Error(data.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}
```

创建 `src/api/index.ts`:
```typescript
export * from './auth'
export * from './product'
export * from './inventory'
export * from './customer'
export * from './sale'
export * from './finance'
export * from './report'
```

**Step 4: 运行测试确认通过**

```bash
npm test tests/utils/request.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add src/utils/request.ts src/api/index.ts tests/utils/request.test.ts
git commit -m "feat: 封装 API 请求工具，支持 Token 和错误处理"
```

---

## Task 3: 认证 API

**Files:**
- Create: `src/api/auth.ts`
- Create: `tests/api/auth.test.ts`

**Step 1: 写失败的测试**

创建 `tests/api/auth.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, logout, getCurrentUser } from '../../src/api/auth'
import * as request from '../../src/utils/request'

vi.mock('../../src/utils/request', () => ({
  request: vi.fn(),
  setToken: vi.fn(),
  getToken: vi.fn()
}))

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should login successfully', async () => {
    vi.mocked(request.request).mockResolvedValue({
      token: 'test-token',
      user: { id: 1, username: 'admin', name: '管理员', role: 'admin' }
    })

    const result = await login({ username: 'admin', password: 'admin123' })
    
    expect(request.request).toHaveBeenCalledWith({
      url: '/auth/login',
      method: 'POST',
      data: { username: 'admin', password: 'admin123' }
    })
    expect(result.token).toBe('test-token')
  })

  it('should logout and clear token', async () => {
    await logout()
    expect(request.setToken).toHaveBeenCalledWith(null)
  })

  it('should get current user info', async () => {
    vi.mocked(request.request).mockResolvedValue({
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin'
    })

    const user = await getCurrentUser()
    expect(user.username).toBe('admin')
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm test tests/api/auth.test.ts
# Expected: FAIL
```

**Step 3: 实现最小代码**

创建 `src/api/auth.ts`:
```typescript
import { request, setToken } from '../utils/request'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: UserInfo
}

export interface UserInfo {
  id: number
  username: string
  name: string
  role: string
}

export async function login(params: LoginParams): Promise<LoginResult> {
  const result = await request<LoginResult>({
    url: '/auth/login',
    method: 'POST',
    data: params
  })
  setToken(result.token)
  return result
}

export async function logout(): Promise<void> {
  await request({ url: '/auth/logout', method: 'POST' })
  setToken(null)
}

export async function getCurrentUser(): Promise<UserInfo> {
  return request<UserInfo>({ url: '/auth/me' })
}
```

**Step 4: 运行测试确认通过**

```bash
npm test tests/api/auth.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add src/api/auth.ts tests/api/auth.test.ts
git commit -m "feat: 实现认证 API 接口"
```

---

## Task 4: 用户状态管理

**Files:**
- Create: `src/stores/user.ts`
- Create: `tests/stores/user.test.ts`

**Step 1: 写失败的测试**

创建 `tests/stores/user.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../../src/stores/user'

// Mock API
vi.mock('../../src/api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn()
}))

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have initial state', () => {
    const store = useUserStore()
    expect(store.token).toBeNull()
    expect(store.userInfo).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('should login and update state', async () => {
    const store = useUserStore()
    const { login } = await import('../../src/api/auth')
    
    vi.mocked(login).mockResolvedValue({
      token: 'test-token',
      user: { id: 1, username: 'admin', name: '管理员', role: 'admin' }
    })

    await store.login({ username: 'admin', password: 'admin123' })
    
    expect(store.token).toBe('test-token')
    expect(store.userInfo?.username).toBe('admin')
    expect(store.isLoggedIn).toBe(true)
  })

  it('should logout and clear state', async () => {
    const store = useUserStore()
    store.token = 'test-token'
    store.userInfo = { id: 1, username: 'admin', name: '管理员', role: 'admin' }
    
    await store.logout()
    
    expect(store.token).toBeNull()
    expect(store.userInfo).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm test tests/stores/user.test.ts
# Expected: FAIL
```

**Step 3: 实现最小代码**

创建 `src/stores/user.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, logout as logoutApi, getCurrentUser, type LoginParams, type UserInfo } from '../api/auth'
import { setToken, getToken } from '../utils/request'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const userInfo = ref<UserInfo | null>(null)
  const biometricEnabled = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  async function login(params: LoginParams) {
    const result = await loginApi(params)
    token.value = result.token
    userInfo.value = result.user
    return result
  }

  async function logout() {
    await logoutApi()
    token.value = null
    userInfo.value = null
  }

  async function fetchUserInfo() {
    const user = await getCurrentUser()
    userInfo.value = user
    return user
  }

  function toggleBiometric() {
    biometricEnabled.value = !biometricEnabled.value
    uni.setStorageSync('biometricEnabled', biometricEnabled.value)
  }

  // 初始化时读取本地存储
  function init() {
    const savedBiometric = uni.getStorageSync('biometricEnabled')
    biometricEnabled.value = !!savedBiometric
  }

  return {
    token,
    userInfo,
    biometricEnabled,
    isLoggedIn,
    login,
    logout,
    fetchUserInfo,
    toggleBiometric,
    init
  }
})
```

**Step 4: 运行测试确认通过**

```bash
npm test tests/stores/user.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add src/stores/user.ts tests/stores/user.test.ts
git commit -m "feat: 实现用户状态管理 Pinia Store"
```

---

## Task 5: 登录页面

**Files:**
- Create: `src/pages/login/index.vue`
- Create: `tests/pages/login.test.ts`

**Step 1: 写失败的测试**

创建 `tests/pages/login.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Login from '../../src/pages/login/index.vue'

// Mock API
vi.mock('../../src/api/auth', () => ({
  login: vi.fn()
}))

describe('Login Page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render login form', () => {
    const wrapper = mount(Login)
    expect(wrapper.find('input[data-testid="username"]').exists()).toBe(true)
    expect(wrapper.find('input[data-testid="password"]').exists()).toBe(true)
    expect(wrapper.find('button[data-testid="login-btn"]').exists()).toBe(true)
  })

  it('should show error on empty fields', async () => {
    const wrapper = mount(Login)
    await wrapper.find('button[data-testid="login-btn"]').trigger('click')
    expect(wrapper.find('.error-message').text()).toContain('请输入用户名')
  })

  it('should call login API on submit', async () => {
    const wrapper = mount(Login)
    const { login } = await import('../../src/api/auth')
    
    vi.mocked(login).mockResolvedValue({
      token: 'test-token',
      user: { id: 1, username: 'admin', name: '管理员', role: 'admin' }
    })

    await wrapper.find('input[data-testid="username"]').setValue('admin')
    await wrapper.find('input[data-testid="password"]').setValue('admin123')
    await wrapper.find('button[data-testid="login-btn"]').trigger('click')

    expect(login).toHaveBeenCalledWith({
      username: 'admin',
      password: 'admin123'
    })
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm test tests/pages/login.test.ts
# Expected: FAIL
```

**Step 3: 实现最小代码**

创建 `src/pages/login/index.vue`:
```vue
<template>
  <view class="login-page">
    <view class="login-header">
      <text class="title">ERP 系统</text>
      <text class="subtitle">移动端登录</text>
    </view>
    
    <view class="login-form">
      <view class="form-item">
        <input 
          data-testid="username"
          v-model="form.username"
          placeholder="请输入用户名"
          class="input"
        />
      </view>
      
      <view class="form-item">
        <input 
          data-testid="password"
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          class="input"
        />
      </view>
      
      <view v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </view>
      
      <button 
        data-testid="login-btn"
        class="login-btn"
        @click="handleLogin"
        :loading="loading"
      >
        登录
      </button>
    </view>
    
    <view v-if="showBiometric" class="biometric-login" @click="handleBiometricLogin">
      <text class="biometric-text">指纹/面容登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

const form = ref({
  username: '',
  password: ''
})
const loading = ref(false)
const errorMessage = ref('')

const showBiometric = computed(() => userStore.biometricEnabled)

async function handleLogin() {
  errorMessage.value = ''
  
  if (!form.value.username) {
    errorMessage.value = '请输入用户名'
    return
  }
  if (!form.value.password) {
    errorMessage.value = '请输入密码'
    return
  }
  
  loading.value = true
  try {
    await userStore.login({
      username: form.value.username,
      password: form.value.password
    })
    uni.reLaunch({ url: '/pages/home/index' })
  } catch (e: any) {
    errorMessage.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}

async function handleBiometricLogin() {
  try {
    const result = await uni.startSoterAuthentication({
      requestAuthModes: ['fingerPrint', 'facial'],
      challenge: 'erp-login'
    })
    if (result.errCode === 0) {
      // 生物识别成功，使用保存的凭证登录
      const savedUsername = uni.getStorageSync('savedUsername')
      const savedPassword = uni.getStorageSync('savedPassword')
      if (savedUsername && savedPassword) {
        await userStore.login({ username: savedUsername, password: savedPassword })
        uni.reLaunch({ url: '/pages/home/index' })
      }
    }
  } catch (e) {
    uni.showToast({ title: '认证失败', icon: 'none' })
  }
}
</script>

<style scoped>
.login-page {
  padding: 40px 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.subtitle {
  display: block;
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}

.login-form {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.form-item {
  margin-bottom: 16px;
}

.input {
  width: 100%;
  height: 44px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 12px;
  font-size: 16px;
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  margin-bottom: 16px;
}

.login-btn {
  width: 100%;
  height: 44px;
  background: #1890ff;
  color: #fff;
  border-radius: 4px;
  font-size: 16px;
}

.biometric-login {
  text-align: center;
  margin-top: 20px;
}

.biometric-text {
  color: #1890ff;
  font-size: 14px;
}
</style>
```

**Step 4: 配置页面路由**

修改 `pages.json`:
```json
{
  "pages": [
    {
      "path": "pages/login/index",
      "style": {
        "navigationBarTitleText": "登录"
      }
    },
    {
      "path": "pages/home/index",
      "style": {
        "navigationBarTitleText": "首页"
      }
    }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "ERP",
    "navigationBarBackgroundColor": "#ffffff",
    "backgroundColor": "#f5f5f5"
  }
}
```

**Step 5: 运行测试确认通过**

```bash
npm test tests/pages/login.test.ts
# Expected: PASS
```

**Step 6: Commit**

```bash
git add src/pages/login/ pages.json tests/pages/login.test.ts
git commit -m "feat: 实现登录页面，支持账号密码和生物识别登录"
```

---

## Task 6: 首页

**Files:**
- Create: `src/pages/home/index.vue`
- Create: `src/api/dashboard.ts`
- Create: `tests/pages/home.test.ts`

**Step 1: 写失败的测试**

创建 `tests/pages/home.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Home from '../../src/pages/home/index.vue'

vi.mock('../../src/api/dashboard', () => ({
  getDashboardData: vi.fn()
}))

describe('Home Page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render dashboard cards', async () => {
    const { getDashboardData } = await import('../../src/api/dashboard')
    vi.mocked(getDashboardData).mockResolvedValue({
      todaySales: 12580,
      pendingOrders: 5,
      inventoryWarnings: 3,
      pendingPayments: 2,
      recentOrders: []
    })

    const wrapper = mount(Home)
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('[data-testid="today-sales"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pending-orders"]').exists()).toBe(true)
  })

  it('should call dashboard API on mount', async () => {
    const { getDashboardData } = await import('../../src/api/dashboard')
    vi.mocked(getDashboardData).mockResolvedValue({
      todaySales: 12580,
      pendingOrders: 5,
      inventoryWarnings: 3,
      pendingPayments: 2,
      recentOrders: []
    })

    mount(Home)
    expect(getDashboardData).toHaveBeenCalled()
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm test tests/pages/home.test.ts
# Expected: FAIL
```

**Step 3: 实现最小代码**

创建 `src/api/dashboard.ts`:
```typescript
import { request } from '../utils/request'

export interface DashboardData {
  todaySales: number
  pendingOrders: number
  inventoryWarnings: number
  pendingPayments: number
  recentOrders: RecentOrder[]
}

export interface RecentOrder {
  id: number
  orderNo: string
  customerName: string
  totalAmount: number
  status: string
}

export async function getDashboardData(): Promise<DashboardData> {
  return request<DashboardData>({ url: '/dashboard' })
}
```

创建 `src/pages/home/index.vue`:
```vue
<template>
  <view class="home-page">
    <!-- 顶部状态栏 -->
    <view class="header">
      <text class="title">ERP 系统</text>
      <view class="header-right">
        <view class="notification" @click="goNotifications">
          <text class="icon">🔔</text>
          <view v-if="pendingCount > 0" class="badge">{{ pendingCount }}</view>
        </view>
        <view class="avatar" @click="goProfile">
          <text>{{ userInitial }}</text>
        </view>
      </view>
    </view>
    
    <!-- 今日销售 -->
    <view class="sales-card">
      <text class="label">今日销售</text>
      <view class="amount-row">
        <text class="amount" data-testid="today-sales">¥{{ formatMoney(dashboard.todaySales) }}</text>
        <text class="trend up">↑12.5%</text>
      </view>
    </view>
    
    <!-- 待处理 -->
    <view class="pending-section">
      <text class="section-title">待处理</text>
      <view class="pending-grid">
        <view class="pending-item" data-testid="pending-orders">
          <text class="pending-value">{{ dashboard.pendingOrders }}</text>
          <text class="pending-label">待发货</text>
        </view>
        <view class="pending-item">
          <text class="pending-value warning">{{ dashboard.inventoryWarnings }}</text>
          <text class="pending-label">库存预警</text>
        </view>
        <view class="pending-item">
          <text class="pending-value">{{ dashboard.pendingPayments }}</text>
          <text class="pending-label">待收款</text>
        </view>
      </view>
    </view>
    
    <!-- 快捷操作 -->
    <view class="quick-actions">
      <text class="section-title">快捷操作</text>
      <view class="actions-grid">
        <view class="action-item" @click="goSale">
          <text class="action-icon">🛒</text>
          <text class="action-label">开单</text>
        </view>
        <view class="action-item" @click="goInventory">
          <text class="action-icon">📦</text>
          <text class="action-label">盘点</text>
        </view>
        <view class="action-item" @click="goScan">
          <text class="action-icon">📷</text>
          <text class="action-label">扫码</text>
        </view>
      </view>
    </view>
    
    <!-- 最近订单 -->
    <view class="recent-orders">
      <text class="section-title">最近订单</text>
      <view class="order-list">
        <view 
          v-for="order in dashboard.recentOrders" 
          :key="order.id"
          class="order-item"
          @click="goOrderDetail(order.id)"
        >
          <view class="order-info">
            <text class="order-no">{{ order.orderNo }}</text>
            <text class="customer-name">{{ order.customerName }}</text>
          </view>
          <view class="order-right">
            <text class="order-amount">¥{{ formatMoney(order.totalAmount) }}</text>
            <text class="order-status">{{ order.status }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 底部导航 -->
    <view class="tab-bar">
      <view class="tab-item active">
        <text class="tab-icon">🏠</text>
        <text class="tab-label">首页</text>
      </view>
      <view class="tab-item" @click="goProduct">
        <text class="tab-icon">📦</text>
        <text class="tab-label">商品</text>
      </view>
      <view class="tab-item" @click="goSale">
        <text class="tab-icon">🛒</text>
        <text class="tab-label">开单</text>
      </view>
      <view class="tab-item" @click="goReport">
        <text class="tab-icon">📊</text>
        <text class="tab-label">报表</text>
      </view>
      <view class="tab-item" @click="goProfile">
        <text class="tab-icon">👤</text>
        <text class="tab-label">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { getDashboardData, type DashboardData } from '../../api/dashboard'

const userStore = useUserStore()

const dashboard = ref<DashboardData>({
  todaySales: 0,
  pendingOrders: 0,
  inventoryWarnings: 0,
  pendingPayments: 0,
  recentOrders: []
})

const pendingCount = computed(() => 
  dashboard.value.pendingOrders + dashboard.value.inventoryWarnings + dashboard.value.pendingPayments
)

const userInitial = computed(() => 
  userStore.userInfo?.name?.charAt(0) || 'U'
)

function formatMoney(value: number) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function fetchData() {
  try {
    dashboard.value = await getDashboardData()
  } catch (e) {
    console.error('获取首页数据失败', e)
  }
}

onMounted(() => {
  fetchData()
})

// 导航方法
function goNotifications() {
  uni.navigateTo({ url: '/pages/notifications/index' })
}

function goProfile() {
  uni.switchTab({ url: '/pages/profile/index' })
}

function goSale() {
  uni.switchTab({ url: '/pages/sale/index' })
}

function goInventory() {
  uni.navigateTo({ url: '/pages/inventory/check' })
}

function goScan() {
  uni.navigateTo({ url: '/pages/inventory/scan' })
}

function goProduct() {
  uni.switchTab({ url: '/pages/product/index' })
}

function goReport() {
  uni.switchTab({ url: '/pages/report/index' })
}

function goOrderDetail(id: number) {
  uni.navigateTo({ url: `/pages/sale/detail?id=${id}` })
}
</script>

<style scoped>
.home-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 60px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff;
}

.title {
  font-size: 20px;
  font-weight: bold;
}

.header-right {
  display: flex;
  gap: 16px;
}

.notification {
  position: relative;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  background: #1890ff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sales-card {
  margin: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  border-radius: 12px;
  color: #fff;
}

.sales-card .label {
  font-size: 14px;
  opacity: 0.8;
}

.amount-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 8px;
}

.amount {
  font-size: 28px;
  font-weight: bold;
}

.trend {
  font-size: 12px;
}

.trend.up {
  color: #52c41a;
}

.pending-section, .quick-actions, .recent-orders {
  margin: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}

.pending-grid {
  display: flex;
  justify-content: space-around;
}

.pending-item {
  text-align: center;
}

.pending-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.pending-value.warning {
  color: #ff4d4f;
}

.pending-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.actions-grid {
  display: flex;
  justify-content: space-around;
}

.action-item {
  text-align: center;
  padding: 12px;
}

.action-icon {
  font-size: 24px;
}

.action-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.order-no {
  font-size: 14px;
  color: #333;
}

.customer-name {
  font-size: 12px;
  color: #999;
}

.order-amount {
  font-size: 14px;
  font-weight: bold;
}

.order-status {
  font-size: 12px;
  color: #1890ff;
}

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: #fff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #f0f0f0;
}

.tab-item {
  text-align: center;
  flex: 1;
}

.tab-item.active .tab-label {
  color: #1890ff;
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 10px;
  color: #999;
}
</style>
```

**Step 4: 运行测试确认通过**

```bash
npm test tests/pages/home.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add src/pages/home/ src/api/dashboard.ts tests/pages/home.test.ts
git commit -m "feat: 实现首页，包含数据概览、快捷操作、最近订单"
```

---

## Task 7: 后端 Dashboard API

**Files:**
- Modify: `backend/src/routes/index.ts`
- Create: `backend/src/routes/dashboard.ts`
- Create: `backend/src/services/dashboard.service.ts`

**Step 1: 写失败的测试**

创建 `backend/src/routes/__tests__/dashboard.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../app'
import { prisma } from '../../lib/prisma'

describe('Dashboard API', () => {
  beforeAll(async () => {
    // 创建测试数据
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should return dashboard data', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', 'Bearer test-token')
    
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('todaySales')
    expect(res.body.data).toHaveProperty('pendingOrders')
    expect(res.body.data).toHaveProperty('inventoryWarnings')
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm test backend/src/routes/__tests__/dashboard.test.ts
# Expected: FAIL
```

**Step 3: 实现最小代码**

创建 `backend/src/services/dashboard.service.ts`:
```typescript
import { prisma } from '../lib/prisma'

export async function getDashboardData(userId: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // 今日销售
  const todaySales = await prisma.sale.aggregate({
    where: {
      createdAt: { gte: today, lt: tomorrow },
      status: { not: 'cancelled' }
    },
    _sum: { totalAmount: true }
  })

  // 待发货订单
  const pendingOrders = await prisma.sale.count({
    where: { status: 'pending' }
  })

  // 库存预警
  const inventoryWarnings = await prisma.inventoryItem.count({
    where: {
      quantity: { lte: prisma.inventoryItem.fields.warningThreshold }
    }
  })

  // 待收款
  const pendingPayments = await prisma.sale.count({
    where: { paymentStatus: 'pending' }
  })

  // 最近订单
  const recentOrders = await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { customer: true }
  })

  return {
    todaySales: todaySales._sum.totalAmount || 0,
    pendingOrders,
    inventoryWarnings,
    pendingPayments,
    recentOrders: recentOrders.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      customerName: order.customer?.name || '散客',
      totalAmount: order.totalAmount,
      status: order.status
    }))
  }
}
```

创建 `backend/src/routes/dashboard.ts`:
```typescript
import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import { getDashboardData } from '../services/dashboard.service'

const router = Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user.userId
    const data = await getDashboardData(userId)
    res.json({ code: 0, data })
  } catch (error) {
    next(error)
  }
})

export default router
```

修改 `backend/src/app.ts` 添加路由:
```typescript
import dashboardRouter from './routes/dashboard'
// ...
app.use('/api/dashboard', dashboardRouter)
```

**Step 4: 运行测试确认通过**

```bash
npm test backend/src/routes/__tests__/dashboard.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add backend/src/services/dashboard.service.ts backend/src/routes/dashboard.ts backend/src/app.ts
git commit -m "feat: 添加 Dashboard API，返回首页数据"
```

---

## Task 8: 最终验证与提交

**Step 1: 运行所有测试**

```bash
npm test
# Expected: All tests PASS
```

**Step 2: 运行代码检查**

```bash
npm run lint
# Expected: No errors
```

**Step 3: 本地运行验证**

```bash
# 启动后端
cd backend && npm run dev

# 启动前端 H5
cd erp-mobile && npm run dev:h5

# 访问 http://localhost:5173 验证登录和首页
```

**Step 4: 更新 pages.json 为 TabBar 配置**

```json
{
  "pages": [
    {
      "path": "pages/home/index",
      "style": { "navigationBarTitleText": "首页" }
    },
    {
      "path": "pages/product/index",
      "style": { "navigationBarTitleText": "商品" }
    },
    {
      "path": "pages/sale/index",
      "style": { "navigationBarTitleText": "开单" }
    },
    {
      "path": "pages/report/index",
      "style": { "navigationBarTitleText": "报表" }
    },
    {
      "path": "pages/profile/index",
      "style": { "navigationBarTitleText": "我的" }
    },
    {
      "path": "pages/login/index",
      "style": { "navigationBarTitleText": "登录" }
    }
  ],
  "tabBar": {
    "list": [
      { "pagePath": "pages/home/index", "text": "首页", "iconPath": "static/tab/home.png", "selectedIconPath": "static/tab/home-active.png" },
      { "pagePath": "pages/product/index", "text": "商品", "iconPath": "static/tab/product.png", "selectedIconPath": "static/tab/product-active.png" },
      { "pagePath": "pages/sale/index", "text": "开单", "iconPath": "static/tab/sale.png", "selectedIconPath": "static/tab/sale-active.png" },
      { "pagePath": "pages/report/index", "text": "报表", "iconPath": "static/tab/report.png", "selectedIconPath": "static/tab/report-active.png" },
      { "pagePath": "pages/profile/index", "text": "我的", "iconPath": "static/tab/profile.png", "selectedIconPath": "static/tab/profile-active.png" }
    ]
  }
}
```

**Step 5: 创建 Gitee 仓库并推送**

```bash
# 创建 .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
unpackage/
.hbuilderx/
.env
*.log
EOF

# 初始化仓库
git init
git add .
git commit -m "feat: ERP Mobile App Phase 1 完成

- 项目初始化: uni-app + Vue 3 + Pinia + uView UI
- API 封装: 支持 Token 认证和错误处理
- 认证模块: 登录页面，支持生物识别
- 首页模块: 数据概览、快捷操作、最近订单
- 测试: 单元测试和组件测试
- 后端: Dashboard API"

# 添加 Gitee 远程仓库
git remote add origin https://gitee.com/next_zzz/erp-mobile.git
git push -u origin master
```

---

## Phase 1 完成标准

- [ ] 项目可正常运行 (`npm run dev:h5`)
- [ ] 所有测试通过 (`npm test`)
- [ ] 用户可登录并看到首页数据
- [ ] 代码已提交到 Gitee

---

## 下一阶段预告

**Phase 2: 商品模块 + 扫码入库**
- 商品列表和搜索
- 商品详情
- 扫码功能
- 入库流程
