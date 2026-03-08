<template>
  <div class="customer-list-page" data-testid="customer-list-page">
    <el-card data-testid="customer-list-card">
      <template #header>
        <div class="card-header">
          <span>客户管理</span>
          <el-button type="primary" data-testid="add-customer-btn" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新建客户
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form" data-testid="customer-search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchParams.keyword"
            placeholder="编码/名称/手机号"
            clearable
            data-testid="customer-input-keyword"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchParams.status" placeholder="全部" clearable style="width: 120px" data-testid="customer-select-status">
            <el-option label="正常" value="normal" />
            <el-option label="冻结" value="frozen" />
            <el-option label="注销" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" data-testid="customer-btn-search" @click="handleSearch">搜索</el-button>
          <el-button data-testid="customer-btn-reset" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 客户列表 -->
      <el-table v-loading="loading" :data="customerList" stripe data-testid="customer-table">
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="name" label="客户名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="handleViewDetail(row.id)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column label="信用额度" width="110" align="right">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.balance > row.creditLimit && row.creditLimit > 0 }">
              ¥{{ Number(row.creditLimit || 0).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="欠款余额" width="110" align="right">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.balance > 0 }">
              ¥{{ Number(row.balance || 0).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" data-testid="view-detail-btn" @click="handleViewDetail(row.id)">
              详情
            </el-button>
            <el-button type="primary" link size="small" data-testid="customer-btn-edit" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" data-testid="customer-btn-delete" @click="handleDelete(row)">
              删除
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
        data-testid="customer-pagination"
        @size-change="fetchCustomers"
        @current-change="fetchCustomers"
      />
    </el-card>

    <!-- 新建/编辑客户弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingCustomer ? '编辑客户' : '新建客户'"
      width="500px"
      destroy-on-close
      data-testid="customer-dialog"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px" data-testid="customer-form">
        <el-form-item label="客户编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入客户编码" :disabled="!!editingCustomer" data-testid="customer-form-input-code" />
        </el-form-item>
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入客户名称" data-testid="customer-name-input" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号" data-testid="customer-phone-input" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="formData.address" type="textarea" :rows="2" placeholder="请输入地址" data-testid="customer-form-input-address" />
        </el-form-item>
        <el-form-item label="信用额度" prop="creditLimit">
          <el-input-number
            v-model="formData.creditLimit"
            :min="0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            data-testid="customer-form-input-credit-limit"
          />
        </el-form-item>
        <el-form-item v-if="editingCustomer" label="状态" prop="status">
          <el-select v-model="formData.status" style="width: 100%" data-testid="customer-form-select-status">
            <el-option label="正常" value="normal" />
            <el-option label="冻结" value="frozen" />
            <el-option label="注销" value="cancelled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button data-testid="customer-dialog-btn-cancel" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" data-testid="customer-dialog-btn-submit" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, type CustomerQuery, type CreateCustomerParams } from '@/api/customer'
import type { Customer } from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()

// 搜索参数
const searchParams = reactive<CustomerQuery>({
  keyword: '',
  status: '',
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 列表数据
const loading = ref(false)
const customerList = ref<Customer[]>([])

// 弹窗
const dialogVisible = ref(false)
const editingCustomer = ref<Customer | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive<CreateCustomerParams & { status?: string }>({
  code: '',
  name: '',
  phone: '',
  address: '',
  creditLimit: 0,
  status: 'normal',
})

// 表单验证规则
const formRules: FormRules = {
  code: [
    { required: true, message: '请输入客户编码', trigger: 'blur' },
    { min: 2, max: 20, message: '编码长度 2-20 个字符', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入客户名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度 2-50 个字符', trigger: 'blur' },
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
}

// 获取客户列表
async function fetchCustomers() {
  loading.value = true
  try {
    const result = await getCustomers({
      ...searchParams,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    customerList.value = result.list
    pagination.total = result.total
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchCustomers()
}

// 重置
function handleReset() {
  searchParams.keyword = ''
  searchParams.status = ''
  pagination.page = 1
  fetchCustomers()
}

// 新建客户
function handleCreate() {
  editingCustomer.value = null
  Object.assign(formData, {
    code: '',
    name: '',
    phone: '',
    address: '',
    creditLimit: 0,
    status: 'normal',
  })
  dialogVisible.value = true
}

// 编辑客户
function handleEdit(row: Customer) {
  editingCustomer.value = row
  Object.assign(formData, {
    code: row.code,
    name: row.name,
    phone: row.phone || '',
    address: row.address || '',
    creditLimit: Number(row.creditLimit) || 0,
    status: row.status || 'normal',
  })
  dialogVisible.value = true
}

// 删除客户
async function handleDelete(row: Customer) {
  try {
    await ElMessageBox.confirm(
      `确定要删除客户「${row.name}」吗？如果该客户有销售订单、应收账款或收款记录，将无法删除。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await deleteCustomer(row.id)
    ElMessage.success('删除成功')
    fetchCustomers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 查看详情
function handleViewDetail(id: number) {
  router.push(`/customers/${id}`)
}

// 提交表单
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (editingCustomer.value) {
      await updateCustomer(editingCustomer.value.id, {
        name: formData.name,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        creditLimit: formData.creditLimit,
        status: formData.status,
      })
      ElMessage.success('更新成功')
    } else {
      await createCustomer({
        code: formData.code,
        name: formData.name,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        creditLimit: formData.creditLimit,
      })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchCustomers()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 状态类型
function getStatusType(status: string) {
  const map: Record<string, string> = {
    normal: 'success',
    frozen: 'warning',
    cancelled: 'info',
  }
  return map[status] || 'info'
}

// 状态文本
function getStatusText(status: string) {
  const map: Record<string, string> = {
    normal: '正常',
    frozen: '冻结',
    cancelled: '注销',
  }
  return map[status] || status
}

// 格式化日期
function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchCustomers()
})
</script>

<style scoped lang="scss">
.customer-list-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .search-form {
    margin-bottom: 20px;
  }

  .text-danger {
    color: #f56c6c;
    font-weight: bold;
  }
}
</style>
