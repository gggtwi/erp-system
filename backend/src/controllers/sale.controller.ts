import { Request, Response, NextFunction } from 'express'
import * as saleService from '../services/sale.service'
import { success, fail } from '../lib/response'

// 获取订单列表
export const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      keyword,
      customerId,
      status,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = req.query

    const result = await saleService.getSaleList({
      keyword: keyword as string,
      customerId: customerId ? parseInt(customerId as string) : undefined,
      status: status as string,
      paymentStatus: paymentStatus as string,
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

// 获取订单详情
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的订单ID')
    }

    const sale = await saleService.getSaleById(id)
    return success(res, sale)
  } catch (error) {
    next(error)
  }
}

// 创建销售订单（直接确认）
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, items, discountAmount, paidAmount, paymentMethod, remark } = req.body

    // 参数校验
    if (!customerId) {
      return fail(res, 400, '请选择客户')
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return fail(res, 400, '请添加商品')
    }

    for (const item of items) {
      if (!item.skuId) {
        return fail(res, 400, '商品SKU不能为空')
      }
      if (!item.quantity || item.quantity <= 0) {
        return fail(res, 400, '商品数量必须大于0')
      }
      if (!item.price || item.price <= 0) {
        return fail(res, 400, '商品价格必须大于0')
      }
    }

    const operatorId = req.user!.userId

    const sale = await saleService.createSale(
      {
        customerId,
        items,
        discountAmount: discountAmount || 0,
        paidAmount: paidAmount || 0,
        paymentMethod,
        remark,
      },
      operatorId
    )

    return success(res, sale, '创建成功')
  } catch (error) {
    next(error)
  }
}

// 创建草稿订单
export const createDraft = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, items, discountAmount, paidAmount, remark } = req.body

    if (!customerId) {
      return fail(res, 400, '请选择客户')
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return fail(res, 400, '请添加商品')
    }

    const operatorId = req.user!.userId

    const sale = await saleService.createDraftSale(
      {
        customerId,
        items,
        discountAmount: discountAmount || 0,
        paidAmount: paidAmount || 0,
        remark,
      },
      operatorId
    )

    return success(res, sale, '创建草稿成功')
  } catch (error) {
    next(error)
  }
}

// 更新草稿订单
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的订单ID')
    }

    const operatorId = req.user!.userId
    const sale = await saleService.updateSale(id, req.body, operatorId)
    return success(res, sale, '更新成功')
  } catch (error) {
    next(error)
  }
}

// 确认订单
export const confirm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的订单ID')
    }

    const operatorId = req.user!.userId
    const sale = await saleService.confirmSale(id, operatorId)
    return success(res, sale, '订单已确认')
  } catch (error) {
    next(error)
  }
}

// 取消订单
export const cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的订单ID')
    }

    const operatorId = req.user!.userId
    await saleService.cancelSale(id, operatorId)
    return success(res, null, '订单已取消')
  } catch (error) {
    next(error)
  }
}

// 获取打印数据
export const getPrint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的订单ID')
    }

    const data = await saleService.getPrintData(id)
    return success(res, data)
  } catch (error) {
    next(error)
  }
}

// 删除订单
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的订单ID')
    }

    await saleService.deleteSale(id)
    return success(res, { success: true }, '订单已删除')
  } catch (error) {
    next(error)
  }
}
