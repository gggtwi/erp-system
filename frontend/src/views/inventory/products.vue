<template>
  <div class="products-page">
    <el-card>
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchForm.keyword"
          placeholder="商品编码/名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        
        <el-cascader
          v-model="searchForm.categoryId"
          :options="categoryTree"
          :props="{ value: 'id', label: 'name', checkStrictly: true, emitPath: false }"
          placeholder="分类"
          clearable
          style="width: 200px"
        />
        
        <el-select v-model="searchForm.active" placeholder="状态" clearable style="width: 120px">
          <el-option label="启用" :value="true" />
          <el-option label="禁用" :value="false" />
        </el-select>
        
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleAdd">新增商品</el-button>
      </div>
      
      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="margin-top: 20px"
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
        <el-table-column label="库存" width="100">
          <template #default="{ row }">
            <el-tag v-if="getTotalStock(row) <= 0" type="danger">
              {{ getTotalStock(row) }}
            </el-tag>
            <el-tag v-else-if="getTotalStock(row) <= 10" type="warning">
              {{ getTotalStock(row) }}
            </el-tag>
            <span v-else>{{ getTotalStock(row) }}</span>
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
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="商品编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入商品编码" />
        </el-form-item>
        
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入商品名称" />
        </el-form-item>
        
        <el-form-item label="分类" prop="categoryId">
          <el-cascader
            v-model="formData.categoryId"
            :options="categoryTree"
            :props="{ value: 'id', label: 'name', checkStrictly: true, emitPath: false }"
            placeholder="请选择分类"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="单位" prop="unit">
          <el-input v-model="formData.unit" placeholder="台、套、件等" />
        </el-form-item>
        
        <el-form-item label="保修月数" prop="warranty">
          <el-input-number v-model="formData.warranty" :min="0" :max="120" />
        </el-form-item>
        
        <el-form-item label="状态" prop="active">
          <el-switch v-model="formData.active" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="商品详情"
      width="800px"
    >
      <el-descriptions :column="2" border>
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
      
      <h4 style="margin: 20px 0 10px">SKU 列表</h4>
      <el-table :data="currentProduct?.skus || []" border>
        <el-table-column prop="code" label="SKU编码" width="120" />
        <el-table-column prop="name" label="规格名称" />
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
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct, getProduct } from '@/api/product'
import type { Product, Category } from '@/types'

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

function buildTree(list: Category[], parentId?: number): any[] {
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
  categoryId: undefined as number | undefined,
  unit: '台',
  warranty: 12,
  active: true,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入商品编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
}

// 详情
const detailVisible = ref(false)
const currentProduct = ref<Product | null>(null)

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

// 计算商品总库存
function getTotalStock(product: Product): number {
  if (!product.skus) return 0
  return product.skus.reduce((sum, sku) => sum + (sku.inventory?.quantity || 0), 0)
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 重置
function handleReset() {
  searchForm.keyword = ''
  searchForm.categoryId = undefined
  searchForm.active = undefined
  handleSearch()
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
    categoryId: row.categoryId,
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
    await ElMessageBox.confirm('确定要删除该商品吗？', '提示', {
      type: 'warning',
    })
    await deleteProduct(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    console.error(error)
  }
}

// 对话框关闭
function handleDialogClosed() {
  formRef.value?.resetFields()
  Object.assign(formData, {
    code: '',
    name: '',
    categoryId: undefined,
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
      if (editId.value) {
        await updateProduct(editId.value, formData)
        ElMessage.success('更新成功')
      } else {
        await createProduct(formData)
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

onMounted(() => {
  fetchData()
  fetchCategories()
})
</script>

<style scoped lang="scss">
.products-page {
  .search-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}
</style>
