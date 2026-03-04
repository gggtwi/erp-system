import request from '@/utils/request'
import type { SKU, PaginateResponse } from '@/types'

export interface SKUQuery {
  productId?: number
  keyword?: string
  active?: boolean
  page?: number
  pageSize?: number
}

export interface SKUCreateData {
  productId: number
  code: string
  name: string
  specs?: string
  price: number
  costPrice: number
  barcode?: string
}

export interface SKUUpdateData {
  name?: string
  specs?: string
  price?: number
  costPrice?: number
  barcode?: string
  active?: boolean
}

// SKU 列表
export function getSKUs(params: SKUQuery) {
  return request.get<PaginateResponse<SKU>>('/skus', { params })
}

// SKU 详情（按ID）
export function getSKUById(id: number) {
  return request.get<SKU>(`/skus/id/${id}`)
}

// SKU 详情（按编码）
export function getSKUByCode(code: string) {
  return request.get<SKU>(`/skus/code/${code}`)
}

// 创建 SKU
export function createSKU(data: SKUCreateData) {
  return request.post<SKU>('/skus', data)
}

// 更新 SKU
export function updateSKU(id: number, data: SKUUpdateData) {
  return request.put<SKU>(`/skus/${id}`, data)
}

// 删除 SKU
export function deleteSKU(id: number) {
  return request.delete(`/skus/${id}`)
}
