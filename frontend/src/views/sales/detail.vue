<template>
  <div class="sale-detail-page" data-testid="sales-detail-page">
    <el-card v-loading="loading" data-testid="sales-detail-card">
      <template #header>
        <div class="card-header">
          <span>订单详情</span>
          <div>
            <el-button data-testid="sales-detail-btn-back" @click="handleBack">返回</el-button>
            <el-button
              v-if="order?.debtAmount > 0"
              type="success"
              data-testid="sales-detail-btn-payment"
              @click="showPaymentDialog"
            >
              收款
            </el-button>
            <el-button type="primary" data-testid="sales-detail-btn-print" @click="handlePrint">打印</el-button>
          </div>
        </div>
      </template>
      
      <el-descriptions :column="3" border data-testid="sales-detail-descriptions">
        <el-descriptions-item label="订单号">
          {{ order?.orderNo }}
        </el-descriptions-item>
        <el-descriptions-item label="客户">
          {{ order?.customer?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ order?.customer?.phone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="getStatusType(order?.status || '')">
            {{ getStatusText(order?.status || '') }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="付款状态">
          <el-tag :type="getPaymentStatusType(order?.paymentStatus || '')">
            {{ getPaymentStatusText(order?.paymentStatus || '') }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatTime(order?.createdAt || '') }}
        </el-descriptions-item>
      </el-descriptions>
      
      <h4 style="margin: 20px 0 10px">商品明细</h4>
      <el-table :data="order?.items || []" border show-summary :summary-method="getSummaries" data-testid="sales-detail-items-table">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column label="商品编码" width="120">
          <template #default="{ row }">
            {{ row.sku?.code || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="商品名称">
          <template #default="{ row }">
            <div>
              <div>{{ row.sku?.name || '-' }}</div>
              <div v-if="row.serialNo" style="color: #909399; font-size: 12px">
                序列号: {{ row.serialNo }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="80">
          <template #default="{ row }">
            {{ row.quantity }}
          </template>
        </el-table-column>
        <el-table-column label="单价" width="100">
          <template #default="{ row }">
            ¥{{ Number(row.price).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            ¥{{ Number(row.amount).toFixed(2) }}
          </template>
        </el-table-column>
      </el-table>
      
      <div class="amount-summary">
        <el-descriptions :column="2" border data-testid="sales-detail-amount-summary">
          <el-descriptions-item label="商品金额">
            ¥{{ Number(order?.totalAmount || 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="优惠金额">
            <span style="color: #67c23a">
              -¥{{ Number(order?.discountAmount || 0).toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="已付金额">
            <span style="color: #409eff">
              ¥{{ Number(order?.paidAmount || 0).toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="欠款金额">
            <span v-if="order?.debtAmount > 0" style="color: #f56c6c; font-weight: bold">
              ¥{{ Number(order?.debtAmount || 0).toFixed(2) }}
            </span>
            <span v-else>¥0.00</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <div v-if="order?.remark" style="margin-top: 20px">
        <strong>备注：</strong>{{ order.remark }}
      </div>
    </el-card>
    
    <!-- 打印模板（隐藏） -->
    <div id="print-template" style="display: none">
      <div style="width: 80mm; font-family: monospace; padding: 10px">
        <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px">
          销售单
        </div>
        <div style="border-top: 1px dashed #000; margin: 5px 0"></div>
        <div>单号: {{ order?.orderNo }}</div>
        <div>日期: {{ formatTime(order?.createdAt || '') }}</div>
        <div>客户: {{ order?.customer?.name }}</div>
        <div v-if="order?.customer?.phone">电话: {{ order?.customer?.phone }}</div>
        <div style="border-top: 1px dashed #000; margin: 5px 0"></div>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse">
          <thead>
            <tr>
              <th style="text-align: left">商品</th>
              <th style="text-align: center">数量</th>
              <th style="text-align: right">金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in order?.items" :key="item.id">
              <td>{{ item.sku?.name }}</td>
              <td style="text-align: center">{{ item.quantity }}</td>
              <td style="text-align: right">¥{{ Number(item.amount).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
        <div style="border-top: 1px dashed #000; margin: 5px 0"></div>
        <div>合计: ¥{{ Number(order?.totalAmount || 0).toFixed(2) }}</div>
        <div v-if="order?.discountAmount > 0">
          优惠: ¥{{ Number(order?.discountAmount || 0).toFixed(2) }}
        </div>
        <div>实收: ¥{{ Number(order?.paidAmount || 0).toFixed(2) }}</div>
        <div v-if="order?.debtAmount > 0">
          欠款: ¥{{ Number(order?.debtAmount || 0).toFixed(2) }}
        </div>
        <div style="border-top: 1px dashed #000; margin: 5px 0"></div>
        <div style="text-align: center; font-size: 12px">
          感谢惠顾，欢迎下次光临
        </div>
      </div>
    </div>
    
    <!-- 收款弹窗 -->
    <el-dialog v-model="paymentDialogVisible" title="收款" width="400px" data-testid="sales-detail-payment-dialog">
      <el-form :model="paymentForm" label-width="80px" data-testid="sales-detail-payment-form">
        <el-form-item label="欠款金额">
          <span style="color: #f56c6c; font-weight: bold; font-size: 18px">
            ¥{{ Number(order?.debtAmount || 0).toFixed(2) }}
          </span>
        </el-form-item>
        <el-form-item label="收款金额">
          <el-input-number
            v-model="paymentForm.amount"
            :min="0"
            :max="Number(order?.debtAmount || 0)"
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
            <el-option label="银行卡" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="paymentForm.remark" type="textarea" :rows="2" data-testid="payment-input-remark" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button data-testid="payment-btn-cancel" @click="paymentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="paymentSubmitting" data-testid="payment-btn-submit" @click="handlePayment">
          确认收款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getSaleDetail } from '@/api/sale'
import { createPayment } from '@/api/finance'
import type { Sale } from '@/types'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const order = ref<Sale | null>(null)

// 收款相关
const paymentDialogVisible = ref(false)
const paymentSubmitting = ref(false)
const paymentForm = reactive({
  amount: 0,
  method: 'cash',
  remark: '',
})

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
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 合计
function getSummaries(param: any) {
  const { columns, data } = param
  const sums: string[] = []
  columns.forEach((column: any, index: number) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    if (column.label === '金额') {
      const values = data.map((item: any) => Number(item.amount))
      sums[index] = `¥${values.reduce((prev: number, curr: number) => prev + curr, 0).toFixed(2)}`
    } else {
      sums[index] = ''
    }
  })
  return sums
}

// 获取订单详情
async function fetchData() {
  const id = route.params.id as string
  if (!id) return
  
  loading.value = true
  try {
    order.value = await getSaleDetail(Number(id))
  } catch (error) {
    ElMessage.error('获取订单详情失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 返回
function handleBack() {
  router.push('/sales/orders')
}

// 打印
function handlePrint() {
  const printContent = document.getElementById('print-template')
  if (!printContent) return
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    ElMessage.warning('无法打开打印窗口，请检查浏览器设置')
    return
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>销售单 - ${order.value?.orderNo}</title>
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

// 显示收款弹窗
function showPaymentDialog() {
  paymentForm.amount = Number(order.value?.debtAmount || 0)
  paymentForm.method = 'cash'
  paymentForm.remark = ''
  paymentDialogVisible.value = true
}

// 确认收款
async function handlePayment() {
  if (!order.value?.receivable?.id) {
    ElMessage.error('应收账款信息不存在')
    return
  }
  
  if (paymentForm.amount <= 0) {
    ElMessage.warning('请输入收款金额')
    return
  }
  
  paymentSubmitting.value = true
  try {
    await createPayment({
      receivableId: order.value.receivable.id,
      customerId: order.value.customerId,
      amount: paymentForm.amount,
      method: paymentForm.method,
      remark: paymentForm.remark,
    })
    
    ElMessage.success('收款成功')
    paymentDialogVisible.value = false
    
    // 刷新订单详情
    await fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '收款失败')
  } finally {
    paymentSubmitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.sale-detail-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .amount-summary {
    margin-top: 20px;
    max-width: 500px;
  }
}
</style>
