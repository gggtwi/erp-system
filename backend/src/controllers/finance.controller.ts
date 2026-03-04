import { Request, Response, NextFunction } from 'express'
import * as financeService from '../services/finance.service'
import { success, fail } from '../lib/response'

// ==================== 应收账款控制器 ====================

/**
 * 获取应收账款列表
 */
export const getReceivableList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      keyword,
      customerId,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = req.query

    const result = await financeService.getReceivableList({
      keyword: keyword as string,
      customerId: customerId ? parseInt(customerId as string) : undefined,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取应收账款详情
 */
export const getReceivableById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的应收账款ID')
    }

    const receivable = await financeService.getReceivableById(id)
    return success(res, receivable)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取应收账款统计
 */
export const getReceivableStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await financeService.getReceivableStats()
    return success(res, stats)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取客户欠款详情
 */
export const getCustomerDebt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = parseInt(req.params.id as string)
    if (isNaN(customerId)) {
      return fail(res, 400, '无效的客户ID')
    }

    const debt = await financeService.getCustomerDebt(customerId)
    return success(res, debt)
  } catch (error) {
    next(error)
  }
}

// ==================== 收款控制器 ====================

/**
 * 创建收款记录
 */
export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receivableId, amount, method, remark } = req.body

    // 参数校验
    if (!receivableId) {
      return fail(res, 400, '请选择应收账款')
    }

    if (!amount || amount <= 0) {
      return fail(res, 400, '收款金额必须大于0')
    }

    if (!method) {
      return fail(res, 400, '请选择收款方式')
    }

    // 校验收款方式
    const validMethods = ['cash', 'wechat', 'alipay', 'bank']
    if (!validMethods.includes(method)) {
      return fail(res, 400, '无效的收款方式')
    }

    const operatorId = req.user!.userId

    const payment = await financeService.createPayment(
      {
        receivableId,
        amount,
        method,
        remark,
      },
      operatorId
    )

    return success(res, payment, '收款成功')
  } catch (error) {
    next(error)
  }
}

/**
 * 获取收款记录列表
 */
export const getPaymentList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      keyword,
      customerId,
      method,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = req.query

    const result = await financeService.getPaymentList({
      keyword: keyword as string,
      customerId: customerId ? parseInt(customerId as string) : undefined,
      method: method as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取收款记录详情
 */
export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的收款记录ID')
    }

    const payment = await financeService.getPaymentById(id)
    return success(res, payment)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取收款统计
 */
export const getPaymentStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query

    const stats = await financeService.getPaymentStats(
      startDate as string,
      endDate as string
    )
    return success(res, stats)
  } catch (error) {
    next(error)
  }
}
