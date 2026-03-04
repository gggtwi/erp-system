<template>
  <div class="receivables-page" data-testid="receivables-page">
    <el-card data-testid="receivables-card">
      <!-- 搜索栏 -->
      <div class="search-bar" data-testid="receivables-search-bar">
        <el-input
          v-model="searchForm.keyword"
          placeholder="客户名称"
          clearable
          style="width: 200px"
          data-testid="receivables-input-keyword"
          @keyup.enter="handleSearch"
        />
        
        <el-select v-model="searchForm.status" placeholder="状态" clearable style="width: 150px" data-testid="receivables-select-status">
          <el-option label="未付款" value="unpaid" />
          <el-option label="部分付款" value="partial" />
          <el-option label="已付款" value="paid" />
        </el-select>
        
        <el-button type="primary" data-testid="receivables-btn-search" @click="handleSearch">搜索</el-button>
        <el-button data-testid="receivables-btn-reset" @click="handleReset">重置</el-button>
      </div>
      
      <!-- 统计卡片 -->
      <el-row :gutter="20" style="margin: 20px 0" data-testid="receivables-stats-row">
        <el-col :span="6">
          <div data-testid="receivables-stat-total">
            <el-statistic title="应收总额" :value="stats.totalAmount" :precision="2">
              <template #prefix>¥</template>
            </el-statistic>
          </div>
        </el-col>
        <el-col :span="6">
          <div data-testid="receivables-stat-paid">
            <el-statistic title="已收款" :value="stats.paidAmount" :precision="2">
              <template #prefix>¥</template>
            </el-statistic>
          </div>
        </el-col>
        <el-col :span="6">
          <div data-testid="receivables-stat-debt">
            <el-statistic title="欠款金额" :value="stats.debtAmount" :precision="2">
              <template #prefix>¥</template>
            </el-statistic>
          </div>
        </el-col>
        <el-col :span="6">
          <div data-testid="receivables-stat-customers">
            <el-statistic title="欠款客户" :value="stats.customerCount">
              <template #suffix>位</template>
            </el-statistic>
          </div>
        </el-col>
      </el-row>
      
      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        data-testid="receivables-table"
      >
        <el-table-column prop="orderNo" label="订单号" width="150" />
        <el-table-column label="客户" width="150">
          <template #default="{ row }">
            {{ row.customer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="应收金额" width="120">
          <template #default="{ row }">
            ¥{{ Number(row.amount).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="已收金额" width="120">
          <template #default="{ row }">
            <span style="color: #67c23a">
              ¥{{ Number(row.paidAmount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="剩余金额" width="120">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: bold">
              ¥{{ Number(row.amount - row.paidAmount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'paid'"
              link
              type="primary"
              data-testid="receivables-btn-payment"
              @click="handlePayment(row)"
            >
              收款
            </el-button>
            <el-button link type="primary" data-testid="receivables-btn-detail" @click="handleDetail(row)">
              详情
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
        data-testid="receivables-pagination"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
    
    <!-- 收款对话框 -->
    <el-dialog
      v-model="paymentDialogVisible"
      title="收款核销"
      width="400px"
      data-testid="receivables-payment-dialog"
    >
      <el-form :model="paymentForm" label-width="80px" data-testid="receivables-payment-form">
        <el-form-item label="客户">
          {{ paymentForm.customerName }}
        </el-form-item>
        <el-form-item label="应收金额">
          ¥{{ paymentForm.amount.toFixed(2) }}
        </el-form-item>
        <el-form-item label="已收金额">
          ¥{{ paymentForm.paidAmount.toFixed(2) }}
        </el-form-item>
        <el-form-item label="剩余金额">
          <span style="color: #f56c6c; font-weight: bold">
            ¥{{ paymentForm.remainingAmount.toFixed(2) }}
          </span>
        </el-form-item>
        <el-form-item label="收款金额">
          <el-input-number
            v-model="paymentForm.paymentAmount"
            :min="0"
            :max="paymentForm.remainingAmount"
            :precision="2"
            style="width: 100%"
            data-testid="payment-input-amount"
          />
        </el-form-item>
        <el-form-item label="收款方式">
          <el-select v-model="paymentForm.method" style="width: 100%" data-testid="payment-select-method">
            <el-option label="现金" value="cash" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="银行转账" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="paymentForm.remark"
            type="textarea"
            :rows="2"
            placeholder="备注信息"
            data-testid="payment-input-remark"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button data-testid="payment-btn-cancel" @click="paymentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="paying" data-testid="payment-btn-submit" @click="handlePaymentSubmit">
          确认收款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getReceivables, createPayment } from '@/api/finance'
import dayjs from 'dayjs'

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 统计
const stats = reactive({
  totalAmount: 0,
  paidAmount: 0,
  debtAmount: 0,
  customerCount: 0,
})

// 表格数据
const loading = ref(false)
const tableData = ref<any[]>([])

// 收款
const paymentDialogVisible = ref(false)
const paying = ref(false)
const paymentForm = reactive({
  receivableId: 0,
  customerId: 0,
  customerName: '',
  amount: 0,
  paidAmount: 0,
  remainingAmount: 0,
  paymentAmount: 0,
  method: 'cash',
  remark: '',
})

// 状态映射
function getStatusType(status: string) {
  const map: Record<string, string> = {
    unpaid: 'danger',
    partial: 'warning',
    paid: 'success',
  }
  return map[status] || 'info'
}

function getStatusText(status: string) {
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
    const result = await getReceivables({
      ...searchForm,
      ...pagination,
    })
    tableData.value = result.list
    pagination.total = result.total
    
    // 更新统计
    stats.totalAmount = result.list.reduce((sum: number, item: any) => sum + Number(item.amount), 0)
    stats.paidAmount = result.list.reduce((sum: number, item: any) => sum + Number(item.paidAmount), 0)
    stats.debtAmount = stats.totalAmount - stats.paidAmount
    stats.customerCount = new Set(result.list.map((item: any) => item.customerId)).size
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
  handleSearch()
}

// 收款
function handlePayment(row: any) {
  paymentForm.receivableId = row.id
  paymentForm.customerId = row.customerId
  paymentForm.customerName = row.customer?.name || ''
  paymentForm.amount = Number(row.amount)
  paymentForm.paidAmount = Number(row.paidAmount)
  paymentForm.remainingAmount = paymentForm.amount - paymentForm.paidAmount
  paymentForm.paymentAmount = paymentForm.remainingAmount
  paymentForm.method = 'cash'
  paymentForm.remark = ''
  paymentDialogVisible.value = true
}

// 详情
function handleDetail(_row: any) {
  ElMessage.info('详情功能开发中')
}

// 提交收款
async function handlePaymentSubmit() {
  if (paymentForm.paymentAmount <= 0) {
    ElMessage.warning('请输入收款金额')
    return
  }
  
  paying.value = true
  try {
    await createPayment({
      receivableId: paymentForm.receivableId,
      customerId: paymentForm.customerId,
      amount: paymentForm.paymentAmount,
      method: paymentForm.method,
      remark: paymentForm.remark,
    })
    ElMessage.success('收款成功')
    paymentDialogVisible.value = false
    fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '收款失败')
  } finally {
    paying.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.receivables-page {
  .search-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}
</style>
