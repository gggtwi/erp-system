<template>
  <div class="create-sale-page" data-testid="sales-create-page">
    <el-row :gutter="20">
      <!-- 左侧：商品选择 -->
      <el-col :span="14">
        <el-card data-testid="sales-create-product-card">
          <template #header>
            <div class="card-header">
              <span>选择商品</span>
              <el-input
                v-model="searchKeyword"
                placeholder="搜索商品（编码/名称）"
                clearable
                style="width: 300px"
                data-testid="sales-create-input-search"
                @keyup.enter="searchProducts"
              >
                <template #append>
                  <el-button icon="Search" data-testid="sales-create-btn-search" @click="searchProducts" />
                </template>
              </el-input>
            </div>
          </template>
          
          <el-table
            v-loading="loading"
            :data="productList"
            max-height="500"
            data-testid="sales-create-product-table"
            @row-dblclick="handleAddToCart"
          >
            <el-table-column prop="code" label="编码" width="120" />
            <el-table-column prop="name" label="商品名称" />
            <el-table-column label="规格" width="150">
              <template #default="{ row }">
                <el-select
                  v-if="row.skus && row.skus.length > 0"
                  v-model="row.selectedSkuId"
                  placeholder="选择规格"
                  size="small"
                  style="width: 100%"
                  :data-testid="`sales-create-select-sku-${row.id}`"
                >
                  <el-option
                    v-for="sku in row.skus"
                    :key="sku.id"
                    :label="sku.name"
                    :value="sku.id"
                  />
                </el-select>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="价格" width="100">
              <template #default="{ row }">
                <span v-if="row.selectedSkuId">
                  ¥{{ getSkuPrice(row, row.selectedSkuId)?.toFixed(2) || '-' }}
                </span>
                <span v-else-if="row.skus && row.skus.length > 0">
                  ¥{{ row.skus[0].price?.toFixed(2) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="库存" width="80">
              <template #default="{ row }">
                <span v-if="row.selectedSkuId">
                  {{ getSkuStock(row, row.selectedSkuId) }}
                </span>
                <span v-else-if="row.skus && row.skus.length > 0">
                  {{ row.skus[0].inventory?.quantity || 0 }}
                </span>
                <span v-else>0</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  :disabled="!row.selectedSkuId && (!row.skus || row.skus.length === 0)"
                  :data-testid="`sales-create-btn-add-${row.id}`"
                  @click="handleAddToCart(row)"
                >
                  添加
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <el-pagination
            v-model:current-page="productPagination.page"
            v-model:page-size="productPagination.pageSize"
            :total="productPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, prev, pager, next"
            style="margin-top: 15px; justify-content: flex-end"
            data-testid="sales-create-product-pagination"
            @current-change="fetchProducts"
          />
        </el-card>
      </el-col>
      
      <!-- 右侧：购物车 -->
      <el-col :span="10">
        <el-card data-testid="sales-create-cart-card">
          <template #header>
            <div class="card-header">
              <span>购物车 ({{ cartStore.itemCount }} 件)</span>
              <el-button
                type="danger"
                size="small"
                :disabled="cartStore.items.length === 0"
                data-testid="sales-create-btn-clear-cart"
                @click="handleClearCart"
              >
                清空
              </el-button>
            </div>
          </template>
          
          <!-- 客户选择 -->
          <el-form-item label="客户" style="margin-bottom: 15px">
            <div style="display: flex; gap: 10px">
              <el-select
                v-model="selectedCustomerId"
                placeholder="选择客户"
                filterable
                clearable
                style="width: 250px"
                data-testid="sales-create-select-customer"
              >
                <el-option
                  v-for="customer in customerList"
                  :key="customer.id"
                  :label="customer.name"
                  :value="customer.id"
                >
                  <span style="float: left">{{ customer.name }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">
                    {{ customer.phone }}
                  </span>
                </el-option>
              </el-select>
              <el-button type="success" data-testid="sales-create-btn-new-member" @click="showCreateMemberDialog">
                新建会员
              </el-button>
              <el-button type="warning" data-testid="sales-create-btn-temp-customer" @click="createTempCustomer">
                临时客户
              </el-button>
            </div>
          </el-form-item>
          
          <!-- 购物车列表 -->
          <el-table
            :data="cartStore.items"
            max-height="300"
            show-summary
            :summary-method="getSummaries"
            data-testid="sales-create-cart-table"
          >
            <el-table-column label="商品" min-width="150">
              <template #default="{ row }">
                <div>
                  <div>{{ row.sku.name }}</div>
                  <div style="color: #909399; font-size: 12px">
                    {{ row.sku.code }}
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="100">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.quantity"
                  :min="1"
                  :max="row.sku.inventory?.quantity || 999"
                  size="small"
                  controls-position="right"
                  style="width: 80px"
                  :data-testid="`cart-input-qty-${row.sku.id}`"
                />
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.price"
                  :min="0"
                  :precision="2"
                  size="small"
                  controls-position="right"
                  style="width: 90px"
                  :data-testid="`cart-input-price-${row.sku.id}`"
                />
              </template>
            </el-table-column>
            <el-table-column label="小计" width="90">
              <template #default="{ row }">
                ¥{{ (row.quantity * row.price).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  link
                  size="small"
                  :data-testid="`cart-btn-remove-${row.sku.id}`"
                  @click="cartStore.removeItem(row.sku.id)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 结算区域 -->
          <div class="settlement">
            <el-form label-width="80px" style="margin-top: 20px">
              <el-form-item label="优惠金额">
                <el-input-number
                  v-model="discountAmount"
                  :min="0"
                  :precision="2"
                  controls-position="right"
                  style="width: 150px"
                  data-testid="sales-create-input-discount"
                />
              </el-form-item>
              
              <el-divider />
              
              <div class="amount-info">
                <div>
                  <span>商品金额：</span>
                  <span class="amount">¥{{ cartStore.totalAmount.toFixed(2) }}</span>
                </div>
                <div>
                  <span>优惠金额：</span>
                  <span class="discount">-¥{{ discountAmount.toFixed(2) }}</span>
                </div>
                <div>
                  <span>未付金额：</span>
                  <span class="amount total">¥{{ actualAmount.toFixed(2) }}</span>
                </div>
              </div>
            </el-form>
            
            <el-button
              type="primary"
              size="large"
              style="width: 100%; margin-top: 20px"
              :loading="submitting"
              :disabled="cartStore.items.length === 0 || !selectedCustomerId"
              data-testid="sales-create-btn-submit"
              @click="handleSubmit"
            >
              提交订单
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新建会员客户弹窗 -->
    <el-dialog
      v-model="memberDialogVisible"
      title="新建会员客户"
      width="450px"
      destroy-on-close
      data-testid="sales-create-member-dialog"
    >
      <el-form ref="memberFormRef" :model="memberFormData" :rules="memberFormRules" label-width="80px" data-testid="sales-create-member-form">
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="memberFormData.name" placeholder="请输入客户名称" data-testid="member-form-input-name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="memberFormData.phone" placeholder="请输入手机号" data-testid="member-form-input-phone" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="memberFormData.address" placeholder="请输入地址（选填）" data-testid="member-form-input-address" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button data-testid="member-dialog-btn-cancel" @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="memberSubmitting" data-testid="member-dialog-btn-submit" @click="handleCreateMember">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProducts } from '@/api/product'
import { getCustomers, createSale } from '@/api/sale'
import { createCustomer, generateTempCustomerCode } from '@/api/customer'
import { useCartStore } from '@/stores/cart'
import type { Product, Customer, SKU } from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const cartStore = useCartStore()

// 商品列表
const loading = ref(false)
const searchKeyword = ref('')
const productList = ref<Product[]>([])
const productPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 客户列表
const customerList = ref<Customer[]>([])
const selectedCustomerId = ref<number>()

// 结算
const discountAmount = ref(0)
const submitting = ref(false)

// 新建会员客户
const memberDialogVisible = ref(false)
const memberSubmitting = ref(false)
const memberFormRef = ref<FormInstance>()
const memberFormData = reactive({
  name: '',
  phone: '',
  address: '',
})
const memberFormRules: FormRules = {
  name: [
    { required: true, message: '请输入客户名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度 2-50 个字符', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
}

// 计算金额
const actualAmount = computed(() => {
  return Math.max(0, cartStore.totalAmount - discountAmount.value)
})

// 获取商品列表
async function fetchProducts() {
  loading.value = true
  try {
    const result = await getProducts({
      keyword: searchKeyword.value,
      page: productPagination.page,
      pageSize: productPagination.pageSize,
    })
    productList.value = result.list.map((p: any) => ({
      ...p,
      selectedSkuId: p.skus?.[0]?.id,
    }))
    productPagination.total = result.total
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 搜索商品
function searchProducts() {
  productPagination.page = 1
  fetchProducts()
}

// 获取客户列表
async function fetchCustomers() {
  try {
    const result = await getCustomers()
    // 兼容两种返回格式
    customerList.value = Array.isArray(result) ? result : (result as any).list || []
  } catch (error) {
    console.error(error)
  }
}

// 获取 SKU 价格
function getSkuPrice(product: Product, skuId: number): number | undefined {
  const sku = product.skus?.find((s: SKU) => s.id === skuId)
  return sku ? Number(sku.price) : undefined
}

// 获取 SKU 库存
function getSkuStock(product: Product, skuId: number): number {
  const sku = product.skus?.find((s: SKU) => s.id === skuId)
  return sku?.inventory?.quantity || 0
}

// 添加到购物车
function handleAddToCart(row: Product) {
  const skuId = row.selectedSkuId || row.skus?.[0]?.id
  if (!skuId) {
    ElMessage.warning('该商品没有可用规格')
    return
  }
  
  const sku = row.skus?.find((s: SKU) => s.id === skuId)
  if (!sku) return
  
  const stock = sku.inventory?.quantity || 0
  if (stock <= 0) {
    ElMessage.warning('库存不足')
    return
  }
  
  cartStore.addItem(sku)
  ElMessage.success('已添加到购物车')
}

// 清空购物车
function handleClearCart() {
  ElMessageBox.confirm('确定要清空购物车吗？', '提示', {
    type: 'warning',
  }).then(() => {
    cartStore.clearCart()
    discountAmount.value = 0
    selectedCustomerId.value = undefined
  }).catch(() => {})
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
    if (column.label === '小计') {
      const values = data.map((item: any) => item.quantity * item.price)
      sums[index] = `¥${values.reduce((prev: number, curr: number) => prev + curr, 0).toFixed(2)}`
    } else {
      sums[index] = ''
    }
  })
  return sums
}

// 显示新建会员客户弹窗
function showCreateMemberDialog() {
  memberFormData.name = ''
  memberFormData.phone = ''
  memberFormData.address = ''
  memberDialogVisible.value = true
}

// 创建会员客户
async function handleCreateMember() {
  const valid = await memberFormRef.value?.validate().catch(() => false)
  if (!valid) return

  memberSubmitting.value = true
  try {
    // 生成会员编码：M + 时间戳后6位
    const code = `M${Date.now().toString().slice(-6)}`
    const customer = await createCustomer({
      code,
      name: memberFormData.name,
      phone: memberFormData.phone,
      address: memberFormData.address || undefined,
    })
    
    ElMessage.success('会员客户创建成功')
    memberDialogVisible.value = false
    
    // 刷新客户列表并选中新建的客户
    await fetchCustomers()
    selectedCustomerId.value = customer.id
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    memberSubmitting.value = false
  }
}

// 创建临时客户
async function createTempCustomer() {
  try {
    // 生成临时客户编码：TMP + 时间戳后6位 + 随机数
    const code = generateTempCustomerCode()
    const customer = await createCustomer({
      code,
      name: `临时客户-${code}`,
    })
    
    ElMessage.success(`临时客户 ${code} 创建成功`)
    
    // 刷新客户列表并选中新建的客户
    await fetchCustomers()
    selectedCustomerId.value = customer.id
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  }
}

// 提交订单
async function handleSubmit() {
  if (!selectedCustomerId.value) {
    ElMessage.warning('请选择客户')
    return
  }
  
  if (cartStore.items.length === 0) {
    ElMessage.warning('购物车为空')
    return
  }
  
  submitting.value = true
  try {
    const result = await createSale({
      customerId: selectedCustomerId.value,
      items: cartStore.items.map(item => ({
        skuId: item.sku.id,
        quantity: item.quantity,
        price: item.price,
        serialNos: item.serialNos,
      })),
      discountAmount: discountAmount.value,
    })
    
    ElMessage.success('订单创建成功')
    cartStore.clearCart()
    discountAmount.value = 0
    selectedCustomerId.value = undefined
    
    // 跳转到订单详情
    router.push(`/sales/orders/${result.id}`)
  } catch (error: any) {
    ElMessage.error(error.message || '订单创建失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchProducts()
  fetchCustomers()
})
</script>

<style scoped lang="scss">
.create-sale-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .settlement {
    .amount-info {
      line-height: 2;
      
      .amount {
        font-size: 16px;
        font-weight: bold;
        
        &.total {
          color: #f56c6c;
          font-size: 20px;
        }
      }
      
      .discount {
        color: #67c23a;
      }
      
      .debt {
        color: #e6a23c;
        font-weight: bold;
      }
    }
  }
}
</style>
