import request from '@/utils/request'

export interface SalesSummaryParams {
  startDate?: string
  endDate?: string
}

export interface SalesSummaryResult {
  summary: {
    totalAmount: number
    orderCount: number
    receivableAmount: number
  }
  trend: Array<{
    date: string
    amount: number
    count: number
  }>
  topProducts: Array<{
    name: string
    quantity: number
    amount: number
  }>
  topCustomers: Array<{
    name: string
    orderCount: number
    amount: number
    debt: number
  }>
}

// 销售汇总
export function getSalesSummary(params: SalesSummaryParams) {
  return request.get<SalesSummaryResult>('/reports/sales/summary', { params })
}

// 销售明细
export function getSalesDetail(params: SalesSummaryParams) {
  return request.get('/reports/sales/detail', { params })
}

// 库存汇总
export function getInventorySummary() {
  return request.get('/reports/inventory/summary')
}

// 库存预警
export function getInventoryWarning() {
  return request.get('/reports/inventory/warning')
}

// 应收账款报表
export function getReceivableReport(params?: SalesSummaryParams) {
  return request.get('/reports/finance/receivable', { params })
}

// 利润分析
export function getProfitAnalysis(params?: SalesSummaryParams) {
  return request.get('/reports/profit/analysis', { params })
}
