import request from '@/utils/request'
import type { Sale, SaleItem, Customer, PaginateResponse } from '@/types'

export interface SaleQuery {
  page?: number
  pageSize?: number
  status?: string
  customerId?: number
  startDate?: string
  endDate?: string
}

export interface CreateSaleParams {
  customerId: number
  items: Array<{
    skuId: number
    quantity: number
    price: number
    serialNos?: string[]
  }>
  discountAmount?: number
  paidAmount?: number
  paymentMethod?: string
  remark?: string
}

// 销售订单列表
export function getSales(params: SaleQuery) {
  return request.get<PaginateResponse<Sale>>('/sales', { params })
}

// 销售订单详情
export function getSaleDetail(id: number) {
  return request.get<Sale & { items: SaleItem[] }>(`/sales/${id}`)
}

// 创建销售订单
export function createSale(data: CreateSaleParams) {
  return request.post<Sale>('/sales', data)
}

// 更新销售订单
export function updateSale(id: number, data: Partial<CreateSaleParams>) {
  return request.put<Sale>(`/sales/${id}`, data)
}

// 确认订单
export function confirmSale(id: number) {
  return request.post<Sale>(`/sales/${id}/confirm`)
}

// 取消订单
export function cancelSale(id: number) {
  return request.post<Sale>(`/sales/${id}/cancel`)
}

// 删除订单
export function deleteSale(id: number) {
  return request.delete(`/sales/${id}`)
}

// 客户列表
export function getCustomers(params?: { keyword?: string }) {
  return request.get<Customer[]>('/customers', { params })
}

// 客户详情
export function getCustomer(id: number) {
  return request.get<Customer>(`/customers/${id}`)
}

// 创建客户
export function createCustomer(data: Partial<Customer>) {
  return request.post<Customer>('/customers', data)
}

// 更新客户
export function updateCustomer(id: number, data: Partial<Customer>) {
  return request.put<Customer>(`/customers/${id}`, data)
}
