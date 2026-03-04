import request from '@/utils/request'
import type { Customer, Sale, Receivable, PaginateResponse } from '@/types'

export interface CustomerQuery {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface CreateCustomerParams {
  code: string
  name: string
  phone?: string
  address?: string
  creditLimit?: number
}

export interface UpdateCustomerParams {
  name?: string
  phone?: string
  address?: string
  creditLimit?: number
  status?: string
}

export interface CustomerHistory {
  customer: Customer
  sales: (Sale & { items: any[] })[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CustomerDebt {
  customer: Customer
  totalDebt: number
  receivables: Receivable[]
  availableCredit: number
}

// 获取客户列表
export function getCustomers(params?: CustomerQuery) {
  return request.get<PaginateResponse<Customer>>('/customers', { params })
}

// 获取客户详情
export function getCustomer(id: number) {
  return request.get<Customer>(`/customers/${id}`)
}

// 创建客户
export function createCustomer(data: CreateCustomerParams) {
  return request.post<Customer>('/customers', data)
}

// 更新客户
export function updateCustomer(id: number, data: UpdateCustomerParams) {
  return request.put<Customer>(`/customers/${id}`, data)
}

// 获取客户购买历史
export function getCustomerHistory(id: number, params?: { page?: number; pageSize?: number }) {
  return request.get<CustomerHistory>(`/customers/${id}/history`, { params })
}

// 获取客户欠款信息
export function getCustomerDebt(id: number) {
  return request.get<CustomerDebt>(`/customers/${id}/debt`)
}

// 删除客户
export function deleteCustomer(id: number) {
  return request.delete(`/customers/${id}`)
}

// 生成临时会员编码
export function generateTempCustomerCode(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return `TMP${timestamp}${random}`
}
