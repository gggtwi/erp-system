<template>
  <div class="customer-detail-page" data-testid="customer-detail-page">
    <!-- 返回按钮 -->
    <div class="page-header">
      <el-button data-testid="customer-detail-btn-back" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <el-button type="primary" data-testid="customer-detail-btn-edit" @click="handleEdit">编辑客户</el-button>
    </div>

    <!-- 客户基本信息 -->
    <el-card v-loading="loading" class="info-card" data-testid="customer-detail-card">
      <template #header>
        <div class="card-header">
          <span>客户信息</span>
          <el-tag :type="getStatusType(customer?.status)" size="large">
            {{ getStatusText(customer?.status) }}
          </el-tag>
        </div>
      </template>

      <el-descriptions :column="3" border data-testid="customer-detail-descriptions">
        <el-descriptions-item label="客户编码">{{ customer?.code }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ customer?.name }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ customer?.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">{{ customer?.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="信用额度">
          <span class="money">¥{{ Number(customer?.creditLimit || 0).toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="欠款余额">
          <span class="money" :class="{ 'text-danger': (customer?.balance || 0) > 0 }">
            ¥{{ Number(customer?.balance || 0).toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="可用额度">
          <span class="money">
            ¥{{ Math.max(0, (customer?.creditLimit || 0) - (customer?.balance || 0)).toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(customer?.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- Tab 页签 -->
    <el-tabs v-model="activeTab" class="detail-tabs" data-testid="customer-detail-tabs">
      <!-- 购买历史 -->
      <el-tab-pane data-testid="customer-tab-history" name="history">
        <template #label>
          <span data-testid="customer-tab-label-history">购买历史</span>
        </template>
        <el-table v-loading="historyLoading" :data="historyList" stripe data-testid="customer-history-table">
          <el-table-column label="订单号" width="180">
            <template #default="{ row }">
              <el-link type="primary" @click="goToSaleDetail(row.id)">
                {{ row.orderNo }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="购买时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="订单金额" width="110" align="right">
            <template #default="{ row }">
              ¥{{ Number(row.totalAmount).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="优惠金额" width="100" align="right">
            <template #default="{ row }">
              ¥{{ Number(row.discountAmount).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="实付金额" width="110" align="right">
            <template #default="{ row }">
              ¥{{ Number(row.paidAmount).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="欠款金额" width="110" align="right">
            <template #default="{ row }">
              <span :class="{ 'text-danger': row.debtAmount > 0 }">
                ¥{{ Number(row.debtAmount).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="getSaleStatusType(row.status)" size="small">
                {{ getSaleStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="商品明细" min-width="200">
            <template #default="{ row }">
              <div v-if="row.items && row.items.length > 0">
                <div v-for="item in row.items.slice(0, 3)" :key="item.id" class="item-row">
                  {{ item.sku?.name || '-' }} x {{ item.quantity }}
                </div>
                <div v-if="row.items.length > 3" class="more-items">
                  还有 {{ row.items.length - 3 }} 件商品...
                </div>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="historyPagination.page"
          v-model:page-size="historyPagination.pageSize"
          :total="historyPagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          style="margin-top: 20px; justify-content: flex-end"
          data-testid="customer-history-pagination"
          @size-change="fetchHistory"
          @current-change="fetchHistory"
        />
      </el-tab-pane>

      <!-- 欠款信息 -->
      <el-tab-pane data-testid="customer-tab-debt" name="debt">
        <template #label>
          <span data-testid="customer-tab-label-debt">欠款信息</span>
        </template>
        <el-card shadow="never" class="debt-summary" data-testid="customer-debt-summary">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">总欠款</div>
                <div class="stat-value text-danger">¥{{ Number(debtInfo?.totalDebt || 0).toFixed(2) }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">信用额度</div>
                <div class="stat-value">¥{{ Number(customer?.creditLimit || 0).toFixed(2) }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">可用额度</div>
                <div class="stat-value">¥{{ Number(debtInfo?.availableCredit || 0).toFixed(2) }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <el-table v-loading="debtLoading" :data="debtInfo?.receivables || []" stripe style="margin-top: 20px" data-testid="customer-debt-table">
          <el-table-column label="订单号" width="180">
            <template #default="{ row }">
              <el-link type="primary" @click="goToSaleDetail(row.saleId)">
                查看订单
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="欠款金额" width="120" align="right">
            <template #default="{ row }">
              ¥{{ Number(row.amount).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="已还金额" width="120" align="right">
            <template #default="{ row }">
              ¥{{ Number(row.paidAmount).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="剩余欠款" width="120" align="right">
            <template #default="{ row }">
              <span class="text-danger">¥{{ Number(row.amount - row.paidAmount).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getReceivableStatusType(row.status)" size="small">
                {{ getReceivableStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="到期日期" width="120">
            <template #default="{ row }">
              {{ row.dueDate ? formatDate(row.dueDate) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑客户弹窗 -->
    <el-dialog v-model="editDialogVisible" title="编辑客户" width="500px" destroy-on-close data-testid="customer-edit-dialog">
      <el-form ref="formRef" :model="editFormData" :rules="formRules" label-width="100px" data-testid="customer-edit-form">
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="editFormData.name" placeholder="请输入客户名称" data-testid="customer-edit-input-name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="editFormData.phone" placeholder="请输入手机号" data-testid="customer-edit-input-phone" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="editFormData.address" type="textarea" :rows="2" placeholder="请输入地址" data-testid="customer-edit-input-address" />
        </el-form-item>
        <el-form-item label="信用额度" prop="creditLimit">
          <el-input-number
            v-model="editFormData.creditLimit"
            :min="0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            data-testid="customer-edit-input-credit-limit"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editFormData.status" style="width: 100%" data-testid="customer-edit-select-status">
            <el-option label="正常" value="normal" />
            <el-option label="冻结" value="frozen" />
            <el-option label="注销" value="cancelled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button data-testid="customer-edit-btn-cancel" @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" data-testid="customer-edit-btn-submit" @click="handleUpdate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  getCustomer,
  getCustomerHistory,
  getCustomerDebt,
  updateCustomer,
  type CustomerHistory,
  type CustomerDebt,
  type UpdateCustomerParams,
} from '@/api/customer'
import type { Customer } from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const route = useRoute()

// 客户信息
const loading = ref(false)
const customer = ref<Customer | null>(null)

// Tab
const activeTab = ref('history')

// 购买历史
const historyLoading = ref(false)
const historyList = ref<any[]>([])
const historyPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 欠款信息
const debtLoading = ref(false)
const debtInfo = ref<CustomerDebt | null>(null)

// 编辑弹窗
const editDialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editFormData = reactive<UpdateCustomerParams>({
  name: '',
  phone: '',
  address: '',
  creditLimit: 0,
  status: 'normal',
})

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入客户名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度 2-50 个字符', trigger: 'blur' },
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
}

// 获取客户详情
async function fetchCustomer() {
  const id = Number(route.params.id)
  if (!id) return

  loading.value = true
  try {
    customer.value = await getCustomer(id)
  } catch (error) {
    console.error(error)
    ElMessage.error('获取客户信息失败')
  } finally {
    loading.value = false
  }
}

// 获取购买历史
async function fetchHistory() {
  const id = Number(route.params.id)
  if (!id) return

  historyLoading.value = true
  try {
    const result = await getCustomerHistory(id, {
      page: historyPagination.page,
      pageSize: historyPagination.pageSize,
    })
    historyList.value = result.sales
    historyPagination.total = result.total
  } catch (error) {
    console.error(error)
  } finally {
    historyLoading.value = false
  }
}

// 获取欠款信息
async function fetchDebt() {
  const id = Number(route.params.id)
  if (!id) return

  debtLoading.value = true
  try {
    debtInfo.value = await getCustomerDebt(id)
  } catch (error) {
    console.error(error)
  } finally {
    debtLoading.value = false
  }
}

// 编辑客户
function handleEdit() {
  if (!customer.value) return
  Object.assign(editFormData, {
    name: customer.value.name,
    phone: customer.value.phone || '',
    address: customer.value.address || '',
    creditLimit: Number(customer.value.creditLimit) || 0,
    status: customer.value.status || 'normal',
  })
  editDialogVisible.value = true
}

// 更新客户
async function handleUpdate() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !customer.value) return

  submitting.value = true
  try {
    await updateCustomer(customer.value.id, editFormData)
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    fetchCustomer()
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

// 跳转订单详情
function goToSaleDetail(id: number) {
  router.push(`/sales/orders/${id}`)
}

// 状态相关
function getStatusType(status?: string) {
  const map: Record<string, string> = {
    normal: 'success',
    frozen: 'warning',
    cancelled: 'info',
  }
  return map[status || ''] || 'info'
}

function getStatusText(status?: string) {
  const map: Record<string, string> = {
    normal: '正常',
    frozen: '冻结',
    cancelled: '注销',
  }
  return map[status || ''] || status
}

function getSaleStatusType(status: string) {
  const map: Record<string, string> = {
    draft: 'info',
    confirmed: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'info'
}

function getSaleStatusText(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getReceivableStatusType(status: string) {
  const map: Record<string, string> = {
    unpaid: 'danger',
    partial: 'warning',
    paid: 'success',
  }
  return map[status] || 'info'
}

function getReceivableStatusText(status: string) {
  const map: Record<string, string> = {
    unpaid: '未付款',
    partial: '部分付款',
    paid: '已付清',
  }
  return map[status] || status
}

// 格式化日期
function formatDate(date?: string) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchCustomer()
  fetchHistory()
  fetchDebt()
})
</script>

<style scoped lang="scss">
.customer-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .info-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .detail-tabs {
    margin-top: 20px;
  }

  .money {
    font-size: 16px;
    font-weight: bold;
  }

  .text-danger {
    color: #f56c6c;
  }

  .debt-summary {
    .stat-item {
      text-align: center;
      padding: 20px 0;

      .stat-label {
        color: #909399;
        font-size: 14px;
        margin-bottom: 10px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
      }
    }
  }

  .item-row {
    line-height: 1.8;
  }

  .more-items {
    color: #909399;
    font-size: 12px;
  }
}
</style>
