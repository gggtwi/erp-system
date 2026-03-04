// 通用响应
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 分页响应
export interface PaginateResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 用户
export interface User {
  id: number
  username: string
  name: string
  role: string
  phone?: string
  active: boolean
  createdAt: string
}

// 分类
export interface Category {
  id: number
  name: string
  parentId?: number
  sort: number
  active: boolean
  children?: Category[]
}

// 商品
export interface Product {
  id: number
  code: string
  name: string
  categoryId: number
  category?: Category
  brand?: string
  unit: string
  warranty: number
  active: boolean
  skus?: SKU[]
  createdAt: string
}

// SKU
export interface SKU {
  id: number
  code: string
  productId: number
  name: string
  specs?: string
  price: number
  costPrice: number
  barcode?: string
  active: boolean
  inventory?: Inventory
}

// 库存
export interface Inventory {
  id: number
  skuId: number
  quantity: number
  lockedQty: number
}

// 客户
export interface Customer {
  id: number
  code: string
  name: string
  phone?: string
  address?: string
  creditLimit: number
  balance: number
  status: string
}

// 销售订单
export interface Sale {
  id: number
  orderNo: string
  customerId: number
  customer?: Customer
  totalAmount: number
  discountAmount: number
  paidAmount: number
  debtAmount: number
  status: string
  paymentStatus: string
  remark?: string
  items?: SaleItem[]
  createdAt: string
}

// 销售明细
export interface SaleItem {
  id: number
  saleId: number
  skuId: number
  sku?: SKU
  quantity: number
  price: number
  amount: number
  serialNo?: string
}
