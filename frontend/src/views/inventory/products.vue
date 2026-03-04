<template>
  <div class="products-page" data-testid="products-page">
    <el-card data-testid="products-card">
      <!-- 搜索栏 -->
      <div class="search-bar" data-testid="products-search-bar">
        <el-input
          v-model="searchForm.keyword"
          placeholder="商品编码/名称"
          clearable
          style="width: 200px"
          data-testid="products-input-keyword"
          @keyup.enter="handleSearch"
        />
        
        <div data-testid="products-cascader-category">
          <el-cascader
            v-model="searchForm.categoryId"
            :options="categoryTree"
            :props="{ value: 'id', label: 'name', checkStrictly: true, emitPath: false }"
            placeholder="分类"
            clearable
            style="width: 200px"
          />
        </div>
        
        <el-select v-model="searchForm.active" placeholder="状态" clearable style="width: 120px" data-testid="products-select-status">
          <el-option label="启用" :value="true" />
          <el-option label="禁用" :value="false" />
        </el-select>
        
        <el-button type="primary" data-testid="products-btn-search" @click="handleSearch">搜索</el-button>
        <el-button data-testid="products-btn-refresh" @click="handleRefresh">刷新</el-button>
        <el-button type="primary" data-testid="products-btn-add" @click="handleAdd">新增商品</el-button>
      </div>
      
      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="margin-top: 20px"
        data-testid="products-table"
      >
        <el-table-column prop="code" label="商品编码" width="120" />
        <el-table-column prop="name" label="商品名称" min-width="150" />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            {{ row.category?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="warranty" label="保修(月)" width="90" />
        <el-table-column label="规格数" width="80">
          <template #default="{ row }">
            {{ row.skus?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="库存" width="130">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-tag v-if="getTotalStock(row) <= 0" type="danger">
                {{ getTotalStock(row) }}
              </el-tag>
              <el-tag v-else-if="getTotalStock(row) <= 10" type="warning">
                {{ getTotalStock(row) }}
              </el-tag>
              <span v-else>{{ getTotalStock(row) }}</span>
              <el-button 
                v-if="row.skus?.length > 0 && canAdjustStock"
                link 
                type="primary" 
                size="small"
                data-testid="products-btn-stock"
                @click="handleEditStock(row)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.active ? 'success' : 'info'">
              {{ row.active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" data-testid="products-btn-edit" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="primary" data-testid="products-btn-detail" @click="handleDetail(row)">详情</el-button>
            <el-button link type="danger" data-testid="products-btn-delete" @click="handleDelete(row)">删除</el-button>
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
        data-testid="products-pagination"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      data-testid="products-dialog"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
        data-testid="products-form"
      >
        <el-form-item label="商品编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入商品编码" data-testid="product-form-input-code" />
        </el-form-item>
        
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入商品名称" data-testid="product-form-input-name" />
        </el-form-item>
        
        <el-form-item label="分类" prop="categoryName">
          <el-select
            v-model="formData.categoryName"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入分类名称"
            style="width: 100%"
            data-testid="product-form-select-category"
          >
            <el-option
              v-for="cat in flatCategories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.name"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="单位" prop="unit">
          <el-input v-model="formData.unit" placeholder="台、套、件等" data-testid="product-form-input-unit" />
        </el-form-item>
        
        <el-form-item label="保修月数" prop="warranty">
          <el-input-number v-model="formData.warranty" :min="0" :max="120" data-testid="product-form-input-warranty" />
        </el-form-item>
        
        <el-form-item label="状态" prop="active">
          <el-switch v-model="formData.active" data-testid="product-form-switch-active" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button data-testid="product-dialog-btn-cancel" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" data-testid="product-dialog-btn-submit" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="商品详情"
      width="900px"
      data-testid="product-detail-dialog"
    >
      <el-descriptions :column="2" border data-testid="product-detail-descriptions">
        <el-descriptions-item label="商品编码">
          {{ currentProduct?.code }}
        </el-descriptions-item>
        <el-descriptions-item label="商品名称">
          {{ currentProduct?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="分类">
          {{ currentProduct?.category?.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="单位">
          {{ currentProduct?.unit }}
        </el-descriptions-item>
        <el-descriptions-item label="保修月数">
          {{ currentProduct?.warranty }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentProduct?.active ? 'success' : 'info'">
            {{ currentProduct?.active ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      
      <!-- SKU 管理 -->
      <div class="sku-section">
        <div class="sku-header">
          <h4>SKU 管理</h4>
          <el-button type="primary" size="small" data-testid="product-detail-btn-add-sku" @click="handleAddSKU">
            新增 SKU
          </el-button>
        </div>
        
        <el-table :data="currentProduct?.skus || []" border data-testid="product-detail-sku-table">
          <el-table-column prop="code" label="SKU编码" width="140" />
          <el-table-column prop="name" label="规格名称" min-width="150">
            <template #default="{ row }">
              {{ row.name }}
              <div v-if="row.specs" class="spec-tags">
                <el-tag v-for="(value, key) in parseSpecs(row.specs)" :key="key" size="small" style="margin-right: 4px">
                  {{ key }}: {{ value }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="销售价" width="100">
            <template #default="{ row }">
              ¥{{ Number(row.price).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="成本价" width="100">
            <template #default="{ row }">
              ¥{{ Number(row.costPrice).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="库存" width="80">
            <template #default="{ row }">
              {{ row.inventory?.quantity || 0 }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" data-testid="sku-btn-edit" @click="handleEditSKU(row)">编辑</el-button>
              <el-button link type="danger" size="small" data-testid="sku-btn-delete" @click="handleDeleteSKU(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
    
    <!-- SKU 新增/编辑对话框 -->
    <el-dialog
      v-model="skuDialogVisible"
      :title="skuDialogTitle"
      width="600px"
      data-testid="sku-dialog"
      @closed="handleSKUDialogClosed"
    >
      <el-form
        ref="skuFormRef"
        :model="skuFormData"
        :rules="skuRules"
        label-width="100px"
        data-testid="sku-form"
      >
        <el-form-item label="SKU编码" prop="code">
          <div style="display: flex; gap: 8px;">
            <el-input v-model="skuFormData.code" placeholder="请输入SKU编码" style="flex: 1" data-testid="sku-form-input-code" />
            <el-button data-testid="sku-form-btn-generate" @click="generateSKUPrefix">自动生成</el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="规格名称" prop="name">
          <el-input v-model="skuFormData.name" placeholder="规格名称（如：红色-XL）" data-testid="sku-form-input-name" />
        </el-form-item>
        
        <!-- 规格选择 -->
        <el-form-item label="规格">
          <div class="spec-list">
            <div v-for="(spec, index) in skuFormData.specList" :key="index" class="spec-item">
              <el-select
                v-model="spec.specName"
                placeholder="选择规格类型"
                style="width: 120px"
                :data-testid="`sku-form-select-spec-name-${index}`"
                @change="updateSKUName"
              >
                <el-option
                  v-for="type in activeSpecTypes"
                  :key="type.id"
                  :label="type.name"
                  :value="type.name"
                />
              </el-select>
              <el-input
                v-model="spec.specValue"
                placeholder="规格值"
                style="width: 120px"
                :data-testid="`sku-form-input-spec-value-${index}`"
                @input="updateSKUName"
              />
              <el-button type="danger" link :data-testid="`sku-form-btn-remove-spec-${index}`" @click="removeSpec(index)">
                删除
              </el-button>
            </div>
            <el-button type="primary" link data-testid="sku-form-btn-add-spec" @click="addSpec">
              + 添加规格
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="销售价" prop="price">
          <el-input-number v-model="skuFormData.price" :min="0" :precision="2" style="width: 200px" data-testid="sku-form-input-price" />
        </el-form-item>
        
        <el-form-item label="成本价" prop="costPrice">
          <el-input-number v-model="skuFormData.costPrice" :min="0" :precision="2" style="width: 200px" data-testid="sku-form-input-cost-price" />
        </el-form-item>
        
        <el-form-item label="条码">
          <el-input v-model="skuFormData.barcode" placeholder="条形码（可选）" data-testid="sku-form-input-barcode" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button data-testid="sku-dialog-btn-cancel" @click="skuDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="skuSubmitLoading" data-testid="sku-dialog-btn-submit" @click="handleSKUSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 库存编辑对话框 -->
    <el-dialog
      v-model="stockDialogVisible"
      title="库存调整"
      width="700px"
      data-testid="stock-dialog"
    >
      <div v-if="stockProduct">
        <el-descriptions :column="2" border style="margin-bottom: 20px;">
          <el-descriptions-item label="商品名称">{{ stockProduct.name }}</el-descriptions-item>
          <el-descriptions-item label="商品编码">{{ stockProduct.code }}</el-descriptions-item>
        </el-descriptions>
        
        <el-table :data="stockSkus" border data-testid="stock-sku-table">
          <el-table-column prop="code" label="SKU编码" width="130" />
          <el-table-column prop="name" label="规格名称" min-width="120" />
          <el-table-column label="当前库存" width="100" align="center">
            <template #default="{ row }">
              {{ row.inventory?.quantity || 0 }}
            </template>
          </el-table-column>
          <el-table-column label="调整后库存" width="150">
            <template #default="{ row }">
              <el-input-number
                v-model="row.newQuantity"
                :min="0"
                :precision="0"
                controls-position="right"
                size="small"
                style="width: 120px"
                :data-testid="`stock-input-quantity-${row.id}`"
              />
            </template>
          </el-table-column>
          <el-table-column label="变动" width="100" align="center">
            <template #default="{ row }">
              <span :style="{ color: (row.newQuantity - (row.inventory?.quantity || 0)) >= 0 ? 'green' : 'red' }">
                {{ (row.newQuantity - (row.inventory?.quantity || 0)) >= 0 ? '+' : '' }}{{ row.newQuantity - (row.inventory?.quantity || 0) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
        
        <el-form-item label="备注" style="margin-top: 16px;">
          <el-input
            v-model="stockRemark"
            type="textarea"
            :rows="2"
            placeholder="请输入调整原因"
            data-testid="stock-input-remark"
          />
        </el-form-item>
      </div>
      <template #footer>
        <el-button data-testid="stock-dialog-btn-cancel" @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stockSubmitLoading" data-testid="stock-dialog-btn-submit" @click="handleStockSubmit">
          确定调整
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct, getProduct } from '@/api/product'
import { createSKU, updateSKU, deleteSKU } from '@/api/sku'
import { getActiveSpecTypes, type SpecType } from '@/api/spec'
import { adjustInventory } from '@/api/inventory'
import { useUserStore } from '@/stores/user'
import type { Product, Category, SKU } from '@/types'

const userStore = useUserStore()

// 检查是否有库存调整权限（admin, warehouse, super_admin）
const canAdjustStock = computed(() => {
  const role = userStore.role
  return role === 'super_admin' || role === 'admin' || role === 'warehouse'
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  categoryId: undefined as number | undefined,
  active: undefined as boolean | undefined,
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 表格数据
const loading = ref(false)
const tableData = ref<Product[]>([])
const categories = ref<Category[]>([])

// 分类树
const categoryTree = computed(() => {
  return buildTree(categories.value)
})

// 扁平化分类列表（用于下拉选择）
const flatCategories = computed(() => {
  return categories.value
})

function buildTree(list: Category[], parentId: number | null = null): any[] {
  return list
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: buildTree(list, item.id),
    }))
}

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增商品')
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const editId = ref<number | null>(null)

const formData = reactive({
  code: '',
  name: '',
  categoryName: '',
  unit: '台',
  warranty: 12,
  active: true,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入商品编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryName: [{ required: true, message: '请选择或输入分类', trigger: 'change' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
}

// 详情
const detailVisible = ref(false)
const currentProduct = ref<Product | null>(null)

// 规格类型
const activeSpecTypes = ref<SpecType[]>([])

// SKU 对话框
const skuDialogVisible = ref(false)
const skuDialogTitle = ref('新增 SKU')
const skuFormRef = ref<FormInstance>()
const skuSubmitLoading = ref(false)
const skuEditId = ref<number | null>(null)

// 库存编辑相关
const stockDialogVisible = ref(false)
const stockProduct = ref<Product | null>(null)
const stockSkus = ref<(SKU & { newQuantity: number })[]>([])
const stockRemark = ref('')
const stockSubmitLoading = ref(false)

// 规格项接口
interface SpecItem {
  specName: string
  specValue: string
}

const skuFormData = reactive({
  code: '',
  name: '',
  specList: [] as SpecItem[],
  price: 0,
  costPrice: 0,
  barcode: '',
})

const skuRules: FormRules = {
  code: [{ required: true, message: '请输入SKU编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入规格名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入销售价', trigger: 'blur' }],
  costPrice: [{ required: true, message: '请输入成本价', trigger: 'blur' }],
}

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    const result = await getProducts({
      ...searchForm,
      ...pagination,
    })
    tableData.value = result.list
    pagination.total = result.total
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 获取分类
async function fetchCategories() {
  try {
    categories.value = await getCategories()
  } catch (error) {
    console.error(error)
  }
}

// 获取规格类型
async function fetchSpecTypes() {
  try {
    activeSpecTypes.value = await getActiveSpecTypes()
  } catch (error) {
    console.error(error)
  }
}

// 计算商品总库存
function getTotalStock(product: Product): number {
  if (!product.skus) return 0
  return product.skus.reduce((sum, sku) => sum + (sku.inventory?.quantity || 0), 0)
}

// 解析规格 JSON
function parseSpecs(specs: string): Record<string, string> {
  try {
    return JSON.parse(specs)
  } catch {
    return {}
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 刷新
function handleRefresh() {
  fetchData()
}

// 新增
function handleAdd() {
  dialogTitle.value = '新增商品'
  editId.value = null
  dialogVisible.value = true
}

// 编辑
function handleEdit(row: Product) {
  dialogTitle.value = '编辑商品'
  editId.value = row.id
  Object.assign(formData, {
    code: row.code,
    name: row.name,
    categoryName: row.category?.name || '',
    unit: row.unit,
    warranty: row.warranty,
    active: row.active,
  })
  dialogVisible.value = true
}

// 详情
async function handleDetail(row: Product) {
  try {
    currentProduct.value = await getProduct(row.id)
    detailVisible.value = true
  } catch (error) {
    console.error(error)
  }
}

// 删除
async function handleDelete(row: Product) {
  try {
    // 如果商品有 SKU，显示 SKU 信息确认框
    if (row.skus && row.skus.length > 0) {
      await ElMessageBox.confirm(
        h('div', [
          h('p', { style: 'margin-bottom: 12px; color: #E6A23C;' }, 
            `该商品包含 ${row.skus.length} 个 SKU，删除后将清除相关库存数据。`
          ),
          h('div', { 
            style: 'max-height: 200px; overflow-y: auto; padding: 12px; background: #f5f7fa; border-radius: 4px; font-size: 13px; line-height: 1.8;' 
          }, row.skus.map(sku => 
            h('div', { style: 'padding: 4px 0; border-bottom: 1px dashed #ddd;' }, [
              h('span', { style: 'font-weight: 500;' }, sku.name),
              h('span', { style: 'color: #909399; margin-left: 8px;' }, `编码: ${sku.code}`),
              h('span', { style: 'color: #67C23A; margin-left: 8px;' }, `¥${sku.price}`),
              sku.inventory && h('span', { style: 'color: #F56C6C; margin-left: 8px;' }, `库存: ${sku.inventory.quantity}`)
            ])
          )),
          h('p', { style: 'margin-top: 12px; color: #F56C6C; font-size: 12px;' }, 
            '注意：如果 SKU 已有销售或采购记录，将无法删除。'
          )
        ]),
        '确认删除商品',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
    } else {
      await ElMessageBox.confirm('确定要删除该商品吗？', '提示', {
        type: 'warning',
      })
    }
    
    await deleteProduct(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 对话框关闭
function handleDialogClosed() {
  formRef.value?.resetFields()
  Object.assign(formData, {
    code: '',
    name: '',
    categoryName: '',
    unit: '台',
    warranty: 12,
    active: true,
  })
}

// 提交
async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitLoading.value = true
    try {
      const submitData = {
        code: formData.code,
        name: formData.name,
        categoryName: formData.categoryName,
        unit: formData.unit,
        warranty: formData.warranty,
        active: formData.active,
      }
      
      if (editId.value) {
        await updateProduct(editId.value, submitData)
        ElMessage.success('更新成功')
      } else {
        await createProduct(submitData)
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

// =============== SKU 管理 ===============

// 自动生成 SKU 编码前缀
function generateSKUPrefix() {
  if (currentProduct.value) {
    const timestamp = Date.now().toString().slice(-6)
    skuFormData.code = `${currentProduct.value.code}-${timestamp}`
  }
}

// 更新 SKU 名称
function updateSKUName() {
  const productName = currentProduct.value?.name || ''
  const specValues = skuFormData.specList
    .filter(s => s.specName && s.specValue)
    .map(s => s.specValue)
    .join('-')
  
  if (specValues) {
    skuFormData.name = `${productName}-${specValues}`
  } else {
    skuFormData.name = productName
  }
}

// 添加规格
function addSpec() {
  skuFormData.specList.push({ specName: '', specValue: '' })
}

// 移除规格
function removeSpec(index: number) {
  skuFormData.specList.splice(index, 1)
  updateSKUName()
}

// 新增 SKU
function handleAddSKU() {
  skuDialogTitle.value = '新增 SKU'
  skuEditId.value = null
  
  // 初始化表单
  skuFormData.code = ''
  skuFormData.name = currentProduct.value?.name || ''
  skuFormData.specList = []
  skuFormData.price = 0
  skuFormData.costPrice = 0
  skuFormData.barcode = ''
  
  // 自动生成编码前缀
  generateSKUPrefix()
  
  skuDialogVisible.value = true
}

// 编辑 SKU
function handleEditSKU(row: SKU) {
  skuDialogTitle.value = '编辑 SKU'
  skuEditId.value = row.id
  
  // 解析规格
  const specs = parseSpecs(row.specs || '{}')
  const specList: SpecItem[] = Object.entries(specs).map(([name, value]) => ({
    specName: name,
    specValue: value as string,
  }))
  
  Object.assign(skuFormData, {
    code: row.code,
    name: row.name,
    specList,
    price: row.price,
    costPrice: row.costPrice,
    barcode: row.barcode || '',
  })
  
  skuDialogVisible.value = true
}

// 删除 SKU
async function handleDeleteSKU(row: SKU) {
  try {
    await ElMessageBox.confirm('确定要删除该 SKU 吗？', '提示', {
      type: 'warning',
    })
    await deleteSKU(row.id)
    ElMessage.success('删除成功')
    
    // 刷新商品详情
    if (currentProduct.value) {
      currentProduct.value = await getProduct(currentProduct.value.id)
    }
  } catch (error) {
    console.error(error)
  }
}

// 编辑库存
function handleEditStock(row: Product) {
  stockProduct.value = row
  stockSkus.value = (row.skus || []).map(sku => ({
    ...sku,
    newQuantity: sku.inventory?.quantity || 0,
  }))
  stockRemark.value = ''
  stockDialogVisible.value = true
}

// 提交库存调整
async function handleStockSubmit() {
  if (!stockSkus.value.length) {
    ElMessage.warning('没有可调整的库存')
    return
  }
  
  // 检查是否有变动
  const changedSkus = stockSkus.value.filter(sku => {
    const oldQty = sku.inventory?.quantity || 0
    return sku.newQuantity !== oldQty
  })
  
  if (changedSkus.length === 0) {
    ElMessage.warning('库存未发生变化')
    return
  }
  
  stockSubmitLoading.value = true
  try {
    // 逐个调整库存
    for (const sku of changedSkus) {
      const oldQty = sku.inventory?.quantity || 0
      await adjustInventory({
        skuId: sku.id,
        quantity: sku.newQuantity,
        type: 'adjust',
        remark: stockRemark.value || undefined,
      })
    }
    
    ElMessage.success(`成功调整 ${changedSkus.length} 个 SKU 的库存`)
    stockDialogVisible.value = false
    
    // 刷新商品列表
    await fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '库存调整失败')
  } finally {
    stockSubmitLoading.value = false
  }
}

// SKU 对话框关闭
function handleSKUDialogClosed() {
  skuFormRef.value?.resetFields()
  skuFormData.specList = []
}

// SKU 提交
async function handleSKUSubmit() {
  if (!skuFormRef.value || !currentProduct.value) return
  
  await skuFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    skuSubmitLoading.value = true
    try {
      // 构建规格对象
      const specs: Record<string, string> = {}
      for (const spec of skuFormData.specList) {
        if (spec.specName && spec.specValue) {
          specs[spec.specName] = spec.specValue
        }
      }
      
      const data = {
        productId: currentProduct.value!.id,
        code: skuFormData.code,
        name: skuFormData.name,
        specs: Object.keys(specs).length > 0 ? JSON.stringify(specs) : undefined,
        price: skuFormData.price,
        costPrice: skuFormData.costPrice,
        barcode: skuFormData.barcode || undefined,
      }
      
      if (skuEditId.value) {
        await updateSKU(skuEditId.value, {
          name: data.name,
          specs: data.specs,
          price: data.price,
          costPrice: data.costPrice,
          barcode: data.barcode,
        })
        ElMessage.success('更新成功')
      } else {
        await createSKU(data)
        ElMessage.success('创建成功')
      }
      
      skuDialogVisible.value = false
      
      // 刷新商品详情
      currentProduct.value = await getProduct(currentProduct.value!.id)
    } catch (error) {
      console.error(error)
    } finally {
      skuSubmitLoading.value = false
    }
  })
}

onMounted(() => {
  fetchData()
  fetchCategories()
  fetchSpecTypes()
})
</script>

<style scoped lang="scss">
.products-page {
  .search-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .sku-section {
    margin-top: 20px;
    
    .sku-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      
      h4 {
        margin: 0;
      }
    }
    
    .spec-tags {
      margin-top: 4px;
    }
  }
  
  .spec-list {
    .spec-item {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
  }
}
</style>
