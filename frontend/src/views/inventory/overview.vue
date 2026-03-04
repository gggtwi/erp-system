<template>
  <div class="inventory-overview-page" data-testid="inventory-overview-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 20px" data-testid="inventory-stats-row">
      <el-col :span="6">
        <el-card shadow="hover" data-testid="inventory-stat-products">
          <el-statistic title="商品总数" :value="stats.totalProducts" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" data-testid="inventory-stat-skus">
          <el-statistic title="SKU 总数" :value="stats.totalSkus" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" data-testid="inventory-stat-warning">
          <el-statistic title="库存预警" :value="stats.warningCount">
            <template #suffix>
              <el-tag type="danger">件</el-tag>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" data-testid="inventory-stat-value">
          <el-statistic title="库存总值" :value="stats.totalValue" :precision="2">
            <template #prefix>¥</template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 库存预警列表 -->
    <el-card data-testid="inventory-warning-card">
      <template #header>
        <div class="card-header">
          <span>库存预警商品</span>
          <el-button type="primary" size="small" data-testid="inventory-btn-refresh" @click="fetchData">
            刷新
          </el-button>
        </div>
      </template>
      
      <el-table v-loading="loading" :data="warningList" border data-testid="inventory-warning-table">
        <el-table-column label="SKU编码" width="120">
          <template #default="{ row }">
            {{ row.skuCode }}
          </template>
        </el-table-column>
        <el-table-column label="商品名称" min-width="200">
          <template #default="{ row }">
            <div>
              <div style="font-weight: 500">{{ row.productName }}</div>
              <div style="color: #909399; font-size: 12px">{{ row.skuName }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="规格" width="180">
          <template #default="{ row }">
            <template v-if="row.specs">
              <template v-if="typeof row.specs === 'string'">
                <template v-if="row.specs.startsWith('{')">
                  <span v-for="(value, key, index) in parseSpecs(row.specs)" :key="key">
                    <el-tag size="small" style="margin-right: 4px">{{ key }}:{{ value }}</el-tag>
                  </span>
                </template>
                <span v-else>{{ row.specs }}</span>
              </template>
              <template v-else-if="typeof row.specs === 'object'">
                <span v-for="(value, key, index) in row.specs" :key="key">
                  <el-tag size="small" style="margin-right: 4px">{{ key }}:{{ value }}</el-tag>
                </span>
              </template>
            </template>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.categoryName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前库存" width="100">
          <template #default="{ row }">
            <el-tag :type="row.quantity <= 0 ? 'danger' : 'warning'">
              {{ row.quantity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="销售价" width="100">
          <template #default="{ row }">
            ¥{{ Number(row.price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="成本价" width="100">
          <template #default="{ row }">
            ¥{{ Number(row.costPrice || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="库存价值" width="120">
          <template #default="{ row }">
            ¥{{ (row.quantity * Number(row.costPrice || 0)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary" data-testid="inventory-btn-adjust" @click="handleAdjust(row)">
              库存调整
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 库存调整对话框 -->
    <el-dialog
      v-model="adjustDialogVisible"
      title="库存调整"
      width="450px"
      data-testid="inventory-adjust-dialog"
    >
      <el-form :model="adjustForm" label-width="80px" data-testid="inventory-adjust-form">
        <el-form-item label="商品信息">
          <div>
            <div style="font-weight: 500">{{ adjustForm.productName }}</div>
            <div style="color: #909399; font-size: 13px">
              {{ adjustForm.skuName }}
              <template v-if="adjustForm.specs">
                <template v-if="typeof adjustForm.specs === 'string'">
                  <template v-if="adjustForm.specs.startsWith('{')">
                    <span v-for="(value, key) in parseSpecs(adjustForm.specs)" :key="key">
                      <el-tag size="small" style="margin-left: 5px">{{ key }}:{{ value }}</el-tag>
                    </span>
                  </template>
                  <el-tag v-else size="small" style="margin-left: 5px">{{ adjustForm.specs }}</el-tag>
                </template>
                <template v-else-if="typeof adjustForm.specs === 'object'">
                  <span v-for="(value, key) in adjustForm.specs" :key="key">
                    <el-tag size="small" style="margin-left: 5px">{{ key }}:{{ value }}</el-tag>
                  </span>
                </template>
              </template>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="当前库存">
          {{ adjustForm.currentQty }}
        </el-form-item>
        <el-form-item label="调整数量">
          <el-input-number
            v-model="adjustForm.quantity"
            :min="-adjustForm.currentQty"
            :max="9999"
            data-testid="adjust-input-quantity"
          />
          <div style="color: #909399; font-size: 12px; margin-top: 5px">
            正数增加库存，负数减少库存
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="adjustForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入调整原因"
            data-testid="adjust-input-remark"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button data-testid="adjust-btn-cancel" @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjusting" data-testid="adjust-btn-submit" @click="handleAdjustSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getInventoryList, getInventoryStats, adjustInventory } from '@/api/inventory'
import type { Inventory } from '@/types'

// 统计数据
const stats = reactive({
  totalProducts: 0,
  totalSkus: 0,
  warningCount: 0,
  totalValue: 0,
})

// 预警列表
const loading = ref(false)
const warningList = ref<any[]>([])

// 库存调整
const adjustDialogVisible = ref(false)
const adjusting = ref(false)
const adjustForm = reactive({
  skuId: 0,
  skuName: '',
  productName: '',
  specs: '',
  categoryName: '',
  currentQty: 0,
  quantity: 0,
  remark: '',
})

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    // 获取统计数据
    const statsData = await getInventoryStats()
    stats.totalProducts = statsData.totalProducts
    stats.totalSkus = statsData.totalSkus
    stats.warningCount = statsData.warningCount
    stats.totalValue = statsData.totalValue
    
    // 获取库存预警列表
    const result = await getInventoryList({ lowStock: true, pageSize: 100 })
    warningList.value = result.list
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 打开调整对话框
function handleAdjust(row: any) {
  adjustForm.skuId = row.skuId
  adjustForm.skuName = row.skuName || ''
  adjustForm.productName = row.productName || ''
  adjustForm.specs = row.specs || ''
  adjustForm.categoryName = row.categoryName || ''
  adjustForm.currentQty = row.quantity
  adjustForm.quantity = 0
  adjustForm.remark = ''
  adjustDialogVisible.value = true
}

// 提交调整
async function handleAdjustSubmit() {
  if (adjustForm.quantity === 0) {
    ElMessage.warning('调整数量不能为 0')
    return
  }
  
  adjusting.value = true
  try {
    // 根据数量正负判断类型
    const type = adjustForm.quantity > 0 ? 'in' : 'out'
    const absQuantity = Math.abs(adjustForm.quantity)
    
    await adjustInventory({
      skuId: adjustForm.skuId,
      quantity: absQuantity,
      type,
      remark: adjustForm.remark,
    })
    ElMessage.success('库存调整成功')
    adjustDialogVisible.value = false
    fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '库存调整失败')
  } finally {
    adjusting.value = false
  }
}

// 解析 specs JSON 字符串
function parseSpecs(specs: string): Record<string, string> {
  try {
    return JSON.parse(specs)
  } catch {
    return {}
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.inventory-overview-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
