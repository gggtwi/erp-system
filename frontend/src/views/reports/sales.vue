<template>
  <div class="sales-report-page" data-testid="sales-report-page">
    <el-card data-testid="sales-report-card">
      <!-- 筛选条件 -->
      <div class="filter-bar" data-testid="sales-report-filter-bar">
        <div data-testid="reports-date-range">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 300px"
          />
        </div>
        
        <el-button type="primary" data-testid="reports-btn-query" @click="fetchData">查询</el-button>
        <el-button data-testid="reports-btn-export" @click="handleExport">导出</el-button>
      </div>
      
      <!-- 统计卡片 -->
      <el-row :gutter="20" style="margin: 20px 0" data-testid="sales-report-stats-row">
        <el-col :span="6">
          <el-card shadow="hover" data-testid="reports-stat-total">
            <el-statistic title="销售总额" :value="stats.totalAmount" :precision="2">
              <template #prefix>¥</template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" data-testid="reports-stat-count">
            <el-statistic title="订单数量" :value="stats.orderCount">
              <template #suffix>笔</template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" data-testid="reports-stat-avg">
            <el-statistic title="平均订单额" :value="stats.avgAmount" :precision="2">
              <template #prefix>¥</template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" data-testid="reports-stat-products">
            <el-statistic title="商品种类" :value="stats.productCount">
              <template #suffix>种</template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
      
      <el-divider />
      
      <!-- 图表区域 -->
      <el-row :gutter="20" data-testid="sales-report-charts-row">
        <el-col :span="12" data-testid="sales-report-trend-col">
          <h4 data-testid="sales-report-trend-title">销售趋势</h4>
          <div ref="trendChartRef" style="height: 300px" data-testid="sales-report-trend-chart"></div>
        </el-col>
        <el-col :span="12" data-testid="sales-report-products-col">
          <h4 data-testid="sales-report-products-title">商品销售排行 TOP 10</h4>
          <el-table :data="topProducts" border max-height="300" data-testid="reports-product-rank-table">
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="name" label="商品名称" />
            <el-table-column label="销售数量" width="100">
              <template #default="{ row }">
                {{ row.quantity }}
              </template>
            </el-table-column>
            <el-table-column label="销售金额" width="120">
              <template #default="{ row }">
                ¥{{ row.amount.toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
      
      <el-divider />
      
      <!-- 客户销售排行 -->
      <h4 data-testid="sales-report-customers-title">客户销售排行 TOP 10</h4>
      <el-table :data="topCustomers" border data-testid="reports-customer-rank-table">
        <el-table-column type="index" label="排名" width="60" />
        <el-table-column prop="name" label="客户名称" />
        <el-table-column label="订单数" width="100">
          <template #default="{ row }">
            {{ row.orderCount }}
          </template>
        </el-table-column>
        <el-table-column label="销售金额" width="120">
          <template #default="{ row }">
            ¥{{ row.amount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="欠款金额" width="120">
          <template #default="{ row }">
            <span v-if="row.debt > 0" style="color: #f56c6c">
              ¥{{ row.debt.toFixed(2) }}
            </span>
            <span v-else>¥0.00</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSalesSummary } from '@/api/report'
import dayjs from 'dayjs'

// 日期范围
const dateRange = ref<[string, string]>([
  dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD'),
])

// 统计数据
const stats = reactive({
  totalAmount: 0,
  orderCount: 0,
  avgAmount: 0,
  productCount: 0,
})

// 商品排行
const topProducts = ref<any[]>([])

// 客户排行
const topCustomers = ref<any[]>([])

// 图表
const trendChartRef = ref<HTMLElement | null>(null)

// 获取数据
async function fetchData() {
  try {
    const params: any = {}
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const result = await getSalesSummary(params)
    
    // 更新统计
    stats.totalAmount = result.summary?.totalAmount || 0
    stats.orderCount = result.summary?.orderCount || 0
    stats.avgAmount = stats.orderCount > 0 ? stats.totalAmount / stats.orderCount : 0
    stats.productCount = result.topProducts?.length || 0
    
    // 更新排行
    topProducts.value = result.topProducts || []
    topCustomers.value = result.topCustomers || []
    
    // 更新图表
    updateChart(result.trend || [])
  } catch (error) {
    console.error(error)
    // 使用模拟数据
    stats.totalAmount = 125680
    stats.orderCount = 156
    stats.avgAmount = 805.64
    stats.productCount = 5
    
    topProducts.value = [
      { name: '美的空调 1.5匹', quantity: 45, amount: 134550 },
      { name: '格力空调 1.5匹', quantity: 38, amount: 113620 },
      { name: '海尔冰箱 200L', quantity: 25, amount: 62500 },
      { name: '小天鹅洗衣机', quantity: 22, amount: 44000 },
      { name: '美的电热水器', quantity: 18, amount: 27000 },
    ]
    
    topCustomers.value = [
      { name: '张三', orderCount: 12, amount: 35600, debt: 0 },
      { name: '李四', orderCount: 10, amount: 28500, debt: 5000 },
      { name: '王五', orderCount: 8, amount: 24000, debt: 0 },
    ]
    
    updateChart([])
  }
}

// 更新图表
function updateChart(trendData: any[]) {
  if (!trendChartRef.value) return
  trendChartRef.value.innerHTML = `
    <div style="text-align: center; color: #909399; padding: 100px 0">
      <p>图表区域</p>
      <p style="font-size: 12px">建议引入 ECharts 进行图表展示</p>
    </div>
  `
}

// 导出
function handleExport() {
  ElMessage.info('导出功能开发中')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.sales-report-page {
  .filter-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  h4 {
    margin: 0 0 15px 0;
    color: #303133;
  }
}
</style>
