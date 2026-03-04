import request from '@/utils/request'
import type { SKU, Inventory, PaginateResponse } from '@/types'

export interface InventoryQuery {
  page?: number
  pageSize?: number
  keyword?: string
  lowStock?: boolean
}

// 库存列表
export function getInventoryList(params: InventoryQuery) {
  return request.get<PaginateResponse<Inventory & { sku: SKU }>>('/inventory', { params })
}

// 库存详情
export function getInventoryDetail(skuId: number) {
  return request.get<Inventory>(`/inventory/${skuId}`)
}

// 库存调整
export function adjustInventory(data: { skuId: number; quantity: number; remark?: string }) {
  return request.post('/inventory/adjust', data)
}

// SKU 列表
export function getSKUList(productId?: number) {
  return request.get<SKU[]>('/skus', { params: { productId } })
}

// 创建 SKU
export function createSKU(data: Partial<SKU>) {
  return request.post<SKU>('/skus', data)
}

// 更新 SKU
export function updateSKU(id: number, data: Partial<SKU>) {
  return request.put<SKU>(`/skus/${id}`, data)
}

// 删除 SKU
export function deleteSKU(id: number) {
  return request.delete(`/skus/${id}`)
}
