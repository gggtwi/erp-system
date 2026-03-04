<template>
  <div class="sales-page" data-testid="sales-orders-page">
    <el-card data-testid="sales-orders-card">
      <!-- 搜索栏 -->
      <div class="search-bar" data-testid="sales-orders-search-bar">
        <el-input
          v-model="searchForm.keyword"
          placeholder="订单号/客户名称"
          clearable
          style="width: 200px"
          data-testid="sales-orders-input-keyword"
          @keyup.enter="handleSearch"
        />
        
        <el-select v-model="searchForm.status" placeholder="订单状态" clearable style="width: 150px" data-testid="sales-orders-select-status">
          <el-option label="草稿" value="draft" />
          <el-option label="已确认" value="confirmed" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          data-testid="sales-orders-date-range"
        />
        
        <el-button type="primary" data-testid="sales-orders-btn-search" @click="handleSearch">搜索</el-button>
        <el-button data-testid="sales-orders-btn-reset" @click="handleReset">重置</el-button>
      </div>
      
      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="margin-top: 20px"
        data-testid="sales-orders-table"
      >
        <el-table-column prop="orderNo" label="订单号" width="150" />
        <el-table-column label="客户" width="150">
          <template #default="{ row }">
            {{ row.customer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="订单金额" width="120">
          <template #default="{ row }">
            ¥{{ Number(row.totalAmount).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="优惠" width="100">
          <template #default="{ row }">
            ¥{{ Number(row.discountAmount).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="已付" width="120">
          <template #default="{ row }">
            ¥{{ Number(row.paidAmount).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="欠款" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.debtAmount > 0" type="warning">
              ¥{{ Number(row.debtAmount).toFixed(2) }}
            </el-tag>
            <span v-else>¥0.00</span>
          </template>
        </el-table-column>
        <el-table-column label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="付款状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getPaymentStatusType(row.paymentStatus)">
              {{ getPaymentStatusText(row.paymentStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" data-testid="sales-orders-btn-detail" @click="handleDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'draft'"
              link
              type="primary"
              data-testid="sales-orders-btn-confirm"
              @click="handleConfirm(row)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              link
              type="danger"
              data-testid="sales-orders-btn-cancel"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
            <el-button
              v-if="row.status === 'cancelled'"
              link
              type="danger"
              data-testid="sales-orders-btn-delete"
              @click="handleDelete(row)"
            >
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
        data-testid="sales-orders-pagination"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSales, confirmSale, cancelSale, deleteSale } from '@/api/sale'
import type { Sale } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
})

const dateRange = ref<[string, string] | null>(null)

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 表格数据
const loading = ref(false)
const tableData = ref<Sale[]>([])

// 状态映射
function getStatusType(status: string) {
  const map: Record<string, string> = {
    draft: 'info',
    confirmed: 'primary',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getPaymentStatusType(status: string) {
  const map: Record<string, string> = {
    unpaid: 'danger',
    partial: 'warning',
    paid: 'success',
  }
  return map[status] || 'info'
}

function getPaymentStatusText(status: string) {
  const map: Record<string, string> = {
    unpaid: '未付款',
    partial: '部分付款',
    paid: '已付款',
  }
  return map[status] || status
}

// 格式化时间
function formatTime(time: string) {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      ...searchForm,
      ...pagination,
    }
    
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const result = await getSales(params)
    tableData.value = result.list
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
  fetchData()
}

// 重置
function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  dateRange.value = null
  handleSearch()
}

// 详情
function handleDetail(row: Sale) {
  router.push(`/sales/orders/${row.id}`)
}

// 确认订单
async function handleConfirm(row: Sale) {
  try {
    await ElMessageBox.confirm('确定要确认该订单吗？', '提示', {
      type: 'warning',
    })
    await confirmSale(row.id)
    ElMessage.success('订单已确认')
    fetchData()
  } catch (error) {
    console.error(error)
  }
}

// 取消订单
async function handleCancel(row: Sale) {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', {
      type: 'warning',
    })
    await cancelSale(row.id)
    ElMessage.success('订单已取消')
    fetchData()
  } catch (error) {
    console.error(error)
  }
}

// 删除订单
async function handleDelete(row: Sale) {
  try {
    await ElMessageBox.confirm(
      `确定要删除订单「${row.orderNo}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await deleteSale(row.id)
    ElMessage.success('订单已删除')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.sales-page {
  .search-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}
</style>
