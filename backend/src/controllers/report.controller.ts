import { Request, Response, NextFunction } from 'express'
import * as reportService from '../services/report.service'
import { success } from '../lib/response'

// ==================== 销售报表 ====================

/**
 * 销售汇总报表
 * GET /api/reports/sales/summary
 */
export const getSalesSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, groupBy } = req.query

    const result = await reportService.getSalesSummary({
      startDate: startDate as string,
      endDate: endDate as string,
      groupBy: (groupBy as 'day' | 'week' | 'month') || 'day',
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * 销售明细报表
 * GET /api/reports/sales/detail
 */
export const getSalesDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      startDate,
      endDate,
      customerId,
      productId,
      categoryId,
      page = 1,
      pageSize = 20,
    } = req.query

    const result = await reportService.getSalesDetail({
      startDate: startDate as string,
      endDate: endDate as string,
      customerId: customerId ? parseInt(customerId as string) : undefined,
      productId: productId ? parseInt(productId as string) : undefined,
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * 销售排行榜
 * GET /api/reports/sales/ranking
 */
export const getSalesRanking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, type, limit } = req.query

    const result = await reportService.getSalesRanking({
      startDate: startDate as string,
      endDate: endDate as string,
      type: (type as 'product' | 'customer') || 'product',
      limit: parseInt(limit as string) || 10,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// ==================== 库存报表 ====================

/**
 * 库存汇总报表
 * GET /api/reports/inventory/summary
 */
export const getInventorySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId } = req.query

    const result = await reportService.getInventorySummary({
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * 库存预警报表
 * GET /api/reports/inventory/warning
 */
export const getInventoryWarning = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { threshold } = req.query

    const result = await reportService.getInventoryWarning({
      threshold: threshold ? parseInt(threshold as string) : 10,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// ==================== 财务报表 ====================

/**
 * 应收账款报表
 * GET /api/reports/finance/receivable
 */
export const getReceivableReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, customerId, status } = req.query

    const result = await reportService.getReceivableReport({
      startDate: startDate as string,
      endDate: endDate as string,
      customerId: customerId ? parseInt(customerId as string) : undefined,
      status: status as string,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * 利润分析报表
 * GET /api/reports/profit/analysis
 */
export const getProfitAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, groupBy } = req.query

    const result = await reportService.getProfitAnalysis({
      startDate: startDate as string,
      endDate: endDate as string,
      groupBy: (groupBy as 'day' | 'week' | 'month') || 'day',
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}
