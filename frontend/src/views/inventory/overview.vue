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
    <div data-testid="stock-warning">
      <el-card data-testid="inventory-warning-card">
      <template #header>
        <div class="card-header">
          <span>库存预警商品</span>
          <div>
            <el-button type="primary" size="small" data-testid="inventory-btn-batch" @click="handleBatchSetting">
              批量设置阈值
            </el-button>
            <el-button type="primary" size="small" data-testid="inventory-btn-refresh" @click="fetchData">
              刷新
            </el-button>
          </div>
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
        <el-table-column label="预警阈值" width="120">
          <template #default="{ row }">
            <div class="threshold-cell">
              <span>{{ row.warningThreshold }}</span>
              <el-button 
                link 
                type="primary" 
                size="small" 
                @click="handleEditThreshold(row)"
                data-testid="btn-edit-threshold"
              >
                编辑
              </el-button>
            </div>
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
    </div>
    
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
            data-testid="product-stock-input"
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
    
    <!-- 预警阈值编辑对话框 -->
    <el-dialog
      v-model="thresholdDialogVisible"
      title="编辑预警阈值"
      width="450px"
      data-testid="threshold-edit-dialog"
    >
      <el-form :model="thresholdForm" label-width="80px" data-testid="threshold-edit-form">
        <el-form-item label="商品信息">
          <div>
            <div style="font-weight: 500">{{ thresholdForm.productName }}</div>
            <div style="color: #909399; font-size: 13px">{{ thresholdForm.skuName }}</div>
          </div>
        </el-form-item>
        <el-form-item label="当前库存">
          <el-tag :type="thresholdForm.currentQty <= thresholdForm.warningThreshold ? 'warning' : 'success'">
            {{ thresholdForm.currentQty }}
          </el-tag>
        </el-form-item>
        <el-form-item label="预警阈值">
          <el-input-number
            v-model="thresholdForm.warningThreshold"
            :min="0"
            :max="9999"
            data-testid="threshold-input-value"
          />
          <div style="color: #909399; font-size: 12px; margin-top: 5px">
            当库存低于此值时将显示预警
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button data-testid="threshold-btn-cancel" @click="thresholdDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingThreshold" data-testid="threshold-btn-submit" @click="handleThresholdSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 批量设置预警阈值对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量设置预警阈值"
      width="600px"
      data-testid="batch-threshold-dialog"
    >
      <el-form :model="batchForm" label-width="100px" data-testid="batch-threshold-form">
        <el-form-item label="统一阈值">
          <el-input-number
            v-model="batchForm.threshold"
            :min="0"
            :max="9999"
            data-testid="batch-input-threshold"
          />
          <div style="color: #909399; font-size: 12px; margin-top: 5px">
            将所有预警商品的预警阈值设置为统一值
          </div>
        </el-form-item>
        <el-form-item label="影响范围">
          <el-tag>将更新 {{ warningList.length }} 个商品的预警阈值</el-tag>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button data-testid="batch-btn-cancel" @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingBatch" data-testid="batch-btn-submit" @click="handleBatchSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  getInventoryList, 
  getInventoryStats, 
  adjustInventory,
  updateWarningThreshold,
  batchUpdateWarningThreshold
} from '@/api/inventory'
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

// 预警阈值编辑
const thresholdDialogVisible = ref(false)
const savingThreshold = ref(false)
const thresholdForm = reactive({
  skuId: 0,
  skuName: '',
  productName: '',
  currentQty: 0,
  warningThreshold: 10,
})

// 批量设置
const batchDialogVisible = ref(false)
const savingBatch = ref(false)
const batchForm = reactive({
  threshold: 10,
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

// 打开预警阈值编辑对话框
function handleEditThreshold(row: any) {
  thresholdForm.skuId = row.skuId
  thresholdForm.skuName = row.skuName || ''
  thresholdForm.productName = row.productName || ''
  thresholdForm.currentQty = row.quantity
  thresholdForm.warningThreshold = row.warningThreshold || 10
  thresholdDialogVisible.value = true
}

// 提交预警阈值修改
async function handleThresholdSubmit() {
  savingThreshold.value = true
  try {
    await updateWarningThreshold(thresholdForm.skuId, thresholdForm.warningThreshold)
    ElMessage.success('预警阈值更新成功')
    thresholdDialogVisible.value = false
    fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '预警阈值更新失败')
  } finally {
    savingThreshold.value = false
  }
}

// 打开批量设置对话框
function handleBatchSetting() {
  batchForm.threshold = 10
  batchDialogVisible.value = true
}

// 提交批量设置
async function handleBatchSubmit() {
  if (warningList.value.length === 0) {
    ElMessage.warning('没有需要更新的商品')
    return
  }
  
  savingBatch.value = true
  try {
    const updates = warningList.value.map(item => ({
      skuId: item.skuId,
      threshold: batchForm.threshold,
    }))
    
    const result = await batchUpdateWarningThreshold(updates)
    ElMessage.success(`成功更新 ${result.success} 条记录`)
    batchDialogVisible.value = false
    fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '批量更新失败')
  } finally {
    savingBatch.value = false
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
  
  .threshold-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
}
</style>
