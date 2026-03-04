import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/login/index.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/views/layout/index.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/inventory/products',
        },
        {
          path: 'inventory/products',
          name: 'Products',
          component: () => import('@/views/inventory/products.vue'),
          meta: { title: '商品管理' },
        },
        {
          path: 'inventory/overview',
          name: 'InventoryOverview',
          component: () => import('@/views/inventory/overview.vue'),
          meta: { title: '库存概览' },
        },
        {
          path: 'inventory/specs',
          name: 'Specs',
          component: () => import('@/views/spec/index.vue'),
          meta: { title: '规格管理' },
        },
        {
          path: 'sales/create',
          name: 'CreateSale',
          component: () => import('@/views/sales/create.vue'),
          meta: { title: '销售开单' },
        },
        {
          path: 'sales/orders',
          name: 'Sales',
          component: () => import('@/views/sales/orders.vue'),
          meta: { title: '订单列表' },
        },
        {
          path: 'sales/orders/:id',
          name: 'SaleDetail',
          component: () => import('@/views/sales/detail.vue'),
          meta: { title: '订单详情' },
        },
        {
          path: 'finance/receivables',
          name: 'Receivables',
          component: () => import('@/views/finance/receivables.vue'),
          meta: { title: '应收账款' },
        },
        {
          path: 'customers',
          name: 'Customers',
          component: () => import('@/views/customer/index.vue'),
          meta: { title: '客户管理' },
        },
        {
          path: 'customers/:id',
          name: 'CustomerDetail',
          component: () => import('@/views/customer/detail.vue'),
          meta: { title: '客户详情' },
        },
        {
          path: 'reports/sales',
          name: 'SalesReport',
          component: () => import('@/views/reports/sales.vue'),
          meta: { title: '销售报表' },
        },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  // 如果需要认证
  if (to.meta.requiresAuth !== false) {
    if (!userStore.isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }

    // 获取用户信息
    if (!userStore.userInfo) {
      await userStore.fetchUserInfo()
      if (!userStore.userInfo) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }
  }

  // 已登录用户访问登录页，重定向到首页
  if (to.name === 'Login' && userStore.isLoggedIn) {
    next({ path: '/' })
    return
  }

  next()
})

export default router
