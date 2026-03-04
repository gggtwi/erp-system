import request from '@/utils/request'
import type { Receivable, Payment, PaginateResponse } from '@/types'

export interface ReceivableQuery {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  customerId?: number
}

export interface PaymentParams {
  receivableId: number
  customerId: number
  amount: number
  method: string
  remark?: string
}

// 应收账款列表
export function getReceivables(params: ReceivableQuery) {
  return request.get<PaginateResponse<Receivable & { customer: any }>>('/finance/receivables', { params })
}

// 应收账款详情
export function getReceivableDetail(id: number) {
  return request.get<Receivable>(`/finance/receivables/${id}`)
}

// 创建收款记录
export function createPayment(data: PaymentParams) {
  return request.post<Payment>('/finance/payments', data)
}

// 收款记录列表
export function getPayments(params?: { customerId?: number }) {
  return request.get<Payment[]>('/finance/payments', { params })
}

// 客户欠款详情
export function getCustomerDebt(customerId: number) {
  return request.get(`/finance/customers/${customerId}/debt`)
}

// 应收账款统计
export function getReceivableStats() {
  return request.get<{
    totalAmount: number
    totalPaid: number
    totalRemaining: number
    debtCustomerCount: number
    byStatus: {
      unpaid: { count: number; amount: number }
      partial: { count: number; amount: number }
      paid: { count: number; amount: number }
    }
  }>('/finance/receivables/stats')
}
