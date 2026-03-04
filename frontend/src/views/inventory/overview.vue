<template>
  <div class="inventory-overview-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="商品总数" :value="stats.totalProducts" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="SKU 总数" :value="stats.totalSkus" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="库存预警" :value="stats.warningCount">
            <template #suffix>
              <el-tag type="danger">件</el-tag>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="库存总值" :value="stats.totalValue" :precision="2">
            <template #prefix>¥</template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 库存预警列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>库存预警商品</span>
          <el-button type="primary" size="small" @click="fetchData">
            刷新
          </el-button>
        </div>
      </template>
      
      <el-table v-loading="loading" :data="warningList" border>
        <el-table-column prop="sku.code" label="SKU编码" width="120" />
        <el-table-column prop="sku.name" label="商品名称" min-width="150" />
        <el-table-column label="当前库存" width="100">
          <template #default="{ row }">
            <el-tag :type="row.quantity <= 0 ? 'danger' : 'warning'">
              {{ row.quantity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="销售价" width="100">
          <template #default="{ row }">
            ¥{{ Number(row.sku?.price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="成本价" width="100">
          <template #default="{ row }">
            ¥{{ Number(row.sku?.costPrice || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="库存价值" width="120">
          <template #default="{ row }">
            ¥{{ (row.quantity * Number(row.sku?.costPrice || 0)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleAdjust(row)">
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
      width="400px"
    >
      <el-form :model="adjustForm" label-width="80px">
        <el-form-item label="商品">
          {{ adjustForm.skuName }}
        </el-form-item>
        <el-form-item label="当前库存">
          {{ adjustForm.currentQty }}
        </el-form-item>
        <el-form-item label="调整数量">
          <el-input-number
            v-model="adjustForm.quantity"
            :min="-adjustForm.currentQty"
            :max="9999"
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
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjusting" @click="handleAdjustSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getInventoryList, adjustInventory } from '@/api/inventory'
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
const warningList = ref<(Inventory & { sku: any })[]>([])

// 库存调整
const adjustDialogVisible = ref(false)
const adjusting = ref(false)
const adjustForm = reactive({
  skuId: 0,
  skuName: '',
  currentQty: 0,
  quantity: 0,
  remark: '',
})

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    // 获取库存预警列表
    const result = await getInventoryList({ lowStock: true, pageSize: 100 })
    warningList.value = result.list
    stats.warningCount = result.list.length
    
    // 这里可以添加更多统计数据的获取
    // 暂时使用模拟数据
    stats.totalProducts = 100
    stats.totalSkus = 150
    stats.totalValue = warningList.value.reduce((sum, item) => {
      return sum + item.quantity * Number(item.sku?.costPrice || 0)
    }, 0)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 打开调整对话框
function handleAdjust(row: any) {
  adjustForm.skuId = row.skuId
  adjustForm.skuName = row.sku?.name || ''
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
    await adjustInventory({
      skuId: adjustForm.skuId,
      quantity: adjustForm.quantity,
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
