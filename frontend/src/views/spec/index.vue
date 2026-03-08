<template>
  <div class="spec-page" data-testid="spec-page">
    <el-card data-testid="spec-card">
      <template #header>
        <div class="card-header">
          <span>规格类型管理</span>
          <div class="header-actions">
            <el-switch
              v-model="showInactive"
              active-text="显示禁用"
              data-testid="spec-switch-show-inactive"
              @change="fetchData"
            />
            <el-button type="primary" data-testid="specs-btn-create" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增规格类型
            </el-button>
          </div>
        </div>
      </template>

      <!-- 说明 -->
      <el-alert
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
        data-testid="spec-alert-info"
      >
        <template #title>
          规格类型用于定义商品的规格维度，如"颜色"、"尺码"、"型号"等。创建 SKU 时，选择规格类型后直接输入规格值即可。可通过拖拽调整顺序。
        </template>
      </el-alert>

      <!-- 拖拽表格 -->
      <div class="drag-table-wrapper" ref="tableWrapperRef">
        <el-table
          v-loading="loading"
          :data="tableData"
          stripe
          border
          row-key="id"
          :row-class-name="tableRowClassName"
          data-testid="specs-table"
          @row-click="handleRowClick"
        >
          <el-table-column width="50" align="center">
            <template #default>
              <el-icon class="drag-handle"><Rank /></el-icon>
            </template>
          </el-table-column>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="规格类型名称" min-width="150">
            <template #default="{ row }">
              <el-tag>{{ row.name }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="row.active"
                :data-testid="`spec-switch-active-${row.id}`"
                @change="handleStatusChange(row)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" data-testid="specs-btn-manage" @click.stop="handleManage(row)">管理</el-button>
              <el-button link type="primary" data-testid="specs-btn-edit" @click.stop="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" data-testid="specs-btn-delete" @click.stop="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="400px"
      data-testid="spec-dialog"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
        data-testid="spec-form"
      >
        <el-form-item label="类型名称" prop="name">
          <el-input v-model="formData.name" placeholder="如：颜色、尺码、型号" data-testid="spec-form-input-name" />
        </el-form-item>
        
        <el-form-item label="规格值" prop="values">
          <el-input v-model="formData.values" placeholder="多个值用逗号分隔，如：红色,蓝色,绿色" data-testid="spec-form-input-values" />
        </el-form-item>
        
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="formData.sort" :min="0" :max="999" data-testid="spec-form-input-sort" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button data-testid="spec-dialog-btn-cancel" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" data-testid="spec-form-btn-submit" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 规格值管理对话框 -->
    <el-dialog
      v-model="manageDialogVisible"
      :title="`管理规格值 - ${currentSpec?.name || ''}`"
      width="600px"
      data-testid="spec-values-dialog"
    >
      <el-table
        v-loading="specValuesLoading"
        :data="specValues"
        stripe
        border
        data-testid="spec-values-table"
      >
        <el-table-column prop="name" label="规格值" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary">编辑</el-button>
            <el-button link type="danger">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <template #footer>
        <el-button @click="manageDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Rank } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import Sortable from 'sortablejs'
import {
  getSpecTypes,
  createSpecType,
  updateSpecType,
  deleteSpecType,
  reorderSpecs,
} from '@/api/spec'
import type { SpecType } from '@/api/spec'

// 列表数据
const loading = ref(false)
const tableData = ref<SpecType[]>([])
const showInactive = ref(false)
const tableWrapperRef = ref<HTMLElement | null>(null)

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增规格类型')
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const editId = ref<number | null>(null)

// 规格值管理
const manageDialogVisible = ref(false)
const currentSpec = ref<SpecType | null>(null)
const specValues = ref<string[]>([])
const specValuesLoading = ref(false)

const formData = reactive({
  name: '',
  values: '',
  sort: 0,
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入规格类型名称', trigger: 'blur' },
    { max: 20, message: '名称不能超过20个字符', trigger: 'blur' },
  ],
}

// 表格行样式（用于拖拽时的视觉反馈）
function tableRowClassName({ row }: { row: SpecType }) {
  return 'drag-row'
}

function handleRowClick(row: SpecType) {
  // 点击行不做任何操作，仅为了防止冒泡
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    tableData.value = await getSpecTypes(showInactive.value)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 初始化拖拽排序
function initDragSort() {
  if (!tableWrapperRef.value) return
  
  const tableBody = tableWrapperRef.value.querySelector('.el-table__body-wrapper tbody')
  if (!tableBody) return
  
  Sortable.create(tableBody, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: async (evt) => {
      // 获取原始数据和新的顺序
      const { oldIndex, newIndex } = evt
      if (oldIndex === undefined || newIndex === undefined) return
      
      if (oldIndex !== newIndex) {
        // 移动数据
        const movedItem = tableData.value.splice(oldIndex, 1)[0]
        tableData.value.splice(newIndex, 0, movedItem)
        
        // 保存排序到后端
        await saveSortOrder()
      }
    },
  })
}

// 保存排序到后端
async function saveSortOrder() {
  const ids = tableData.value.map((item) => item.id)
  try {
    await reorderSpecs(ids)
    ElMessage.success('排序已更新')
  } catch (error) {
    console.error(error)
    fetchData() // 恢复原数据
  }
}

// 新增
function handleAdd() {
  dialogTitle.value = '新增规格类型'
  editId.value = null
  dialogVisible.value = true
}

// 编辑
function handleEdit(row: SpecType) {
  dialogTitle.value = '编辑规格类型'
  editId.value = row.id
  Object.assign(formData, {
    name: row.name,
    sort: row.sort,
  })
  dialogVisible.value = true
}

// 管理规格值
function handleManage(row: SpecType) {
  manageDialogVisible.value = true
  currentSpec.value = row
  fetchSpecValues(row.id)
}

// 删除
async function handleDelete(row: SpecType) {
  try {
    await ElMessageBox.confirm(`确定要删除规格类型"${row.name}"吗？`, '提示', {
      type: 'warning',
    })
    await deleteSpecType(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    console.error(error)
  }
}

// 状态变更
async function handleStatusChange(row: SpecType) {
  try {
    await updateSpecType(row.id, { active: row.active })
    ElMessage.success(row.active ? '已启用' : '已禁用')
  } catch (error) {
    console.error(error)
    fetchData() // 恢复原数据
  }
}

// 对话框关闭
function handleDialogClosed() {
  formRef.value?.resetFields()
  Object.assign(formData, {
    name: '',
    values: '',
    sort: 0,
  })
}

// 获取规格值列表
async function fetchSpecValues(specId: number) {
  specValuesLoading.value = true
  try {
    // 这里应该调用API获取规格值，暂时使用模拟数据
    specValues.value = ['值1', '值2', '值3']
  } catch (error) {
    console.error(error)
  } finally {
    specValuesLoading.value = false
  }
}

// 提交
async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitLoading.value = true
    try {
      // 只发送API支持的字段
      const payload = {
        name: formData.name,
        sort: formData.sort,
      }
      
      if (editId.value) {
        await updateSpecType(editId.value, payload)
        ElMessage.success('更新成功')
      } else {
        await createSpecType(payload)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchData()
    } catch (error) {
      console.error(error)
    } finally {
      submitLoading.value = false
    }
  })
}

onMounted(async () => {
  await fetchData()
  await nextTick()
  initDragSort()
})
</script>

<style scoped lang="scss">
.spec-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }
  }

  .drag-table-wrapper {
    :deep(.el-table) {
      .drag-row {
        cursor: move;
      }

      .drag-handle {
        color: #909399;
        cursor: move;
        font-size: 16px;
        
        &:hover {
          color: #409eff;
        }
      }

      // 拖拽时的样式
      .sortable-ghost {
        background-color: #e6f7ff;
        opacity: 0.8;
      }

      .sortable-chosen {
        background-color: #f0f9ff;
      }

      .sortable-drag {
        background-color: #fff;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.15);
      }
    }
  }
}
</style>
