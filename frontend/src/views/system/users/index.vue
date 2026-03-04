<template>
  <div class="user-list-page" data-testid="user-list-page">
    <el-card data-testid="user-list-card">
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <el-button
            v-if="canCreateUser"
            type="primary"
            data-testid="user-btn-create"
            @click="handleOpenCreateDialog"
          >
            新增用户
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form" data-testid="user-search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchParams.keyword"
            placeholder="用户名/姓名"
            clearable
            data-testid="user-input-keyword"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchParams.role" placeholder="全部" clearable style="width: 140px" data-testid="user-select-role">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="管理员" value="admin" />
            <el-option label="财务" value="finance" />
            <el-option label="销售" value="sales" />
            <el-option label="仓库" value="warehouse" />
            <el-option label="采购" value="purchase" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchParams.active" placeholder="全部" clearable style="width: 100px" data-testid="user-select-active">
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" data-testid="user-btn-search" @click="handleSearch">搜索</el-button>
          <el-button data-testid="user-btn-reset" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 用户列表 -->
      <el-table v-loading="loading" :data="userList" stripe data-testid="user-table">
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" size="small">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="active" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.active ? 'success' : 'danger'" size="small">
              {{ row.active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              data-testid="user-btn-change-password"
              @click="handleOpenPasswordDialog(row)"
            >
              修改密码
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        data-testid="user-pagination"
        @size-change="fetchUsers"
        @current-change="fetchUsers"
      />
    </el-card>

    <!-- 新增用户弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新增用户"
      width="500px"
      destroy-on-close
      data-testid="create-user-dialog"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px" data-testid="create-user-form">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="createForm.username"
            placeholder="请输入用户名"
            data-testid="create-form-input-username"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input
            v-model="createForm.name"
            placeholder="请输入姓名"
            data-testid="create-form-input-name"
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" placeholder="请选择角色" style="width: 100%" data-testid="create-form-select-role">
            <el-option
              v-for="role in creatableRoles"
              :key="role"
              :label="getRoleText(role)"
              :value="role"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="createForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password
            data-testid="create-form-input-password"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="createForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
            data-testid="create-form-input-confirm"
          />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="createForm.phone"
            placeholder="请输入手机号（可选）"
            data-testid="create-form-input-phone"
          />
        </el-form-item>
        <el-form-item label="状态" prop="active">
          <el-switch
            v-model="createForm.active"
            active-text="启用"
            inactive-text="禁用"
            data-testid="create-form-switch-active"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button data-testid="create-dialog-btn-cancel" @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" data-testid="create-dialog-btn-submit" @click="handleSubmitCreate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="450px"
      destroy-on-close
      data-testid="password-dialog"
    >
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="100px" data-testid="password-form">
        <el-form-item label="用户">
          <span>{{ currentUser?.username }} ({{ currentUser?.name }})</span>
        </el-form-item>
        <el-form-item v-if="needOldPassword" label="原密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入原密码"
            show-password
            data-testid="password-form-input-old"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
            data-testid="password-form-input-new"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            data-testid="password-form-input-confirm"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button data-testid="password-dialog-btn-cancel" @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" data-testid="password-dialog-btn-submit" @click="handleSubmitPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getUsers, changeUserPassword, createUser, getCreatableRoles, type User, type UserQuery, type CreateUserParams } from '@/api/user'
import type { FormInstance, FormRules } from 'element-plus'

const userStore = useUserStore()

// 搜索参数
const searchParams = reactive<UserQuery>({
  keyword: '',
  role: undefined,
  active: undefined,
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 列表数据
const loading = ref(false)
const userList = ref<User[]>([])

// 可创建的角色列表
const creatableRoles = ref<string[]>([])

// 是否可以创建用户
const canCreateUser = computed(() => {
  const role = userStore.role
  return role === 'super_admin' || role === 'admin'
})

// 新增用户相关
const createDialogVisible = ref(false)
const submitting = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({
  username: '',
  name: '',
  role: '',
  password: '',
  confirmPassword: '',
  phone: '',
  active: true,
})

// 新增用户表单验证规则
const createRules = computed<FormRules>(() => ({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度为2-20个字符', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度为2-20个字符', trigger: 'blur' },
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== createForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}))

// 修改密码相关
const passwordDialogVisible = ref(false)
const currentUser = ref<User | null>(null)
const passwordFormRef = ref<FormInstance>()
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 判断是否需要输入旧密码
const needOldPassword = computed(() => {
  if (!currentUser.value) return false
  const isSelf = currentUser.value.id === userStore.userInfo?.id
  const isSuperAdmin = userStore.role === 'super_admin'
  const isAdmin = userStore.role === 'admin'
  
  // 超级管理员修改任何人都无需旧密码
  if (isSuperAdmin) return false
  // 管理员修改其他人无需旧密码
  if (isAdmin && !isSelf) return false
  // 其他情况需要旧密码
  return true
})

// 密码表单验证规则
const passwordRules = computed<FormRules>(() => ({
  oldPassword: needOldPassword.value
    ? [{ required: true, message: '请输入原密码', trigger: 'blur' }]
    : [],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}))

// 获取用户列表
async function fetchUsers() {
  loading.value = true
  try {
    const result = await getUsers({
      ...searchParams,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    userList.value = result.list
    pagination.total = result.total
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 获取可创建的角色列表
async function fetchCreatableRoles() {
  try {
    creatableRoles.value = await getCreatableRoles()
  } catch (error) {
    console.error(error)
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchUsers()
}

// 重置
function handleReset() {
  searchParams.keyword = ''
  searchParams.role = undefined
  searchParams.active = undefined
  pagination.page = 1
  fetchUsers()
}

// 打开新增用户弹窗
function handleOpenCreateDialog() {
  createForm.username = ''
  createForm.name = ''
  createForm.role = ''
  createForm.password = ''
  createForm.confirmPassword = ''
  createForm.phone = ''
  createForm.active = true
  createDialogVisible.value = true
}

// 提交新增用户
async function handleSubmitCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const params: CreateUserParams = {
      username: createForm.username,
      name: createForm.name,
      role: createForm.role,
      password: createForm.password,
      phone: createForm.phone || undefined,
      active: createForm.active,
    }
    await createUser(params)
    ElMessage.success('用户创建成功')
    createDialogVisible.value = false
    fetchUsers()
  } catch (error: any) {
    ElMessage.error(error.message || '用户创建失败')
  } finally {
    submitting.value = false
  }
}

// 打开修改密码弹窗
function handleOpenPasswordDialog(user: User) {
  currentUser.value = user
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

// 提交修改密码
async function handleSubmitPassword() {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await changeUserPassword(currentUser.value!.id, {
      oldPassword: needOldPassword.value ? passwordForm.oldPassword : undefined,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码修改成功')
    passwordDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '密码修改失败')
  } finally {
    submitting.value = false
  }
}

// 角色类型
function getRoleType(role: string) {
  const map: Record<string, string> = {
    super_admin: 'danger',
    admin: 'warning',
    finance: 'success',
    sales: 'primary',
    warehouse: 'info',
    purchase: '',
  }
  return map[role] || 'info'
}

// 角色文本
function getRoleText(role: string) {
  const map: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
    finance: '财务',
    sales: '销售',
    warehouse: '仓库',
    purchase: '采购',
  }
  return map[role] || role
}

// 格式化日期
function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchUsers()
  if (canCreateUser.value) {
    fetchCreatableRoles()
  }
})
</script>

<style scoped lang="scss">
.user-list-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .search-form {
    margin-bottom: 20px;
  }
}
</style>
