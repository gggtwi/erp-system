<template>
  <el-container class="layout-container" data-testid="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar" data-testid="layout-sidebar">
      <div class="logo" data-testid="layout-logo">
        <img src="@/assets/vue.svg" alt="Logo" />
        <span v-show="!isCollapse">ERP 系统</span>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :unique-opened="true"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        data-testid="layout-nav-menu"
      >
        <el-sub-menu index="inventory" data-testid="nav-menu-inventory">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>库存管理</span>
          </template>
          <el-menu-item index="/inventory/products" data-testid="nav-menu-products">商品管理</el-menu-item>
          <el-menu-item index="/inventory/overview" data-testid="nav-menu-overview">库存概览</el-menu-item>
          <el-menu-item index="/inventory/specs" data-testid="nav-menu-specs">规格管理</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="sales" data-testid="nav-menu-sales">
          <template #title>
            <el-icon><ShoppingCart /></el-icon>
            <span>销售管理</span>
          </template>
          <el-menu-item index="/sales/create" data-testid="nav-menu-create-sale">销售开单</el-menu-item>
          <el-menu-item index="/sales/orders" data-testid="nav-menu-orders">订单列表</el-menu-item>
        </el-sub-menu>
        
        <el-menu-item index="/customers" data-testid="nav-menu-customers">
          <el-icon><User /></el-icon>
          <span>客户管理</span>
        </el-menu-item>
        
        <el-menu-item index="/finance/receivables" data-testid="nav-menu-receivables">
          <el-icon><Money /></el-icon>
          <span>应收账款</span>
        </el-menu-item>
        
        <el-menu-item index="/reports/sales" data-testid="nav-menu-sales-report">
          <el-icon><DataAnalysis /></el-icon>
          <span>销售报表</span>
        </el-menu-item>
        
        <el-sub-menu index="system" data-testid="nav-menu-system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/system/users" data-testid="nav-menu-users">用户管理</el-menu-item>
          <el-menu-item index="/system/settings" data-testid="nav-menu-settings">系统设置</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header" data-testid="layout-header">
        <div class="left">
          <el-icon
            class="collapse-btn"
            data-testid="layout-btn-collapse"
            @click="isCollapse = !isCollapse"
          >
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          
          <el-breadcrumb separator="/" data-testid="layout-breadcrumb">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta?.title">
              {{ currentRoute.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="right">
          <el-dropdown @command="handleCommand" data-testid="user-dropdown">
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">{{ userStore.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile" data-testid="dropdown-item-profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="password" data-testid="dropdown-item-password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout" data-testid="logout-btn">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 主内容区 -->
      <el-main class="main" data-testid="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const currentRoute = computed(() => route)
const activeMenu = computed(() => route.path)

async function handleCommand(command: string) {
  switch (command) {
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          type: 'warning',
        })
        await userStore.logout()
        ElMessage.success('已退出登录')
        router.push('/login')
      } catch (e) {
        // 取消退出
      }
      break
    case 'password':
      ElMessage.info('修改密码功能开发中')
      break
    case 'profile':
      ElMessage.info('个人信息功能开发中')
      break
  }
}
</script>

<style scoped lang="scss">
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;
  
  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background-color: #263445;
    
    img {
      width: 32px;
      height: 32px;
    }
    
    span {
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      white-space: nowrap;
    }
  }
  
  .el-menu {
    border-right: none;
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  padding: 0 20px;
  
  .left {
    display: flex;
    align-items: center;
    gap: 20px;
    
    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      color: #606266;
      
      &:hover {
        color: #409eff;
      }
    }
  }
  
  .right {
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      
      .username {
        color: #606266;
      }
    }
  }
}

.main {
  background-color: #f0f2f5;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
