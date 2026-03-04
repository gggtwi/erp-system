import { Request, Response, NextFunction } from 'express'
import * as inventoryService from '../services/inventory.service'
import { success, fail } from '../lib/response'

// ==================== 库存查询 ====================

// 获取库存列表
export const getInventoryList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      keyword,
      categoryId,
      lowStock,
      warningThreshold,
      page = 1,
      pageSize = 20,
    } = req.query

    const result = await inventoryService.getInventoryList({
      keyword: keyword as string,
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
      lowStock: lowStock === 'true',
      warningThreshold: warningThreshold
        ? parseInt(warningThreshold as string)
        : 10,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// 获取库存详情
export const getInventoryDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const skuId = parseInt(req.params.skuId as string)
    if (isNaN(skuId)) {
      return fail(res, 400, '无效的 SKU ID')
    }

    const result = await inventoryService.getInventoryDetail(skuId)
    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// ==================== 库存操作 ====================

// 库存调整
export const adjustInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { skuId, quantity, type, remark } = req.body

    if (!skuId) {
      return fail(res, 400, '请选择 SKU')
    }

    if (!quantity || quantity <= 0) {
      return fail(res, 400, '请输入有效的数量')
    }

    if (!['in', 'out', 'adjust'].includes(type)) {
      return fail(res, 400, '无效的调整类型')
    }

    const operatorId = req.user!.userId
    const result = await inventoryService.adjustInventory(
      {
        skuId: parseInt(skuId),
        quantity: parseFloat(quantity),
        type,
        remark,
      },
      operatorId
    )

    return success(res, result, '库存调整成功')
  } catch (error) {
    next(error)
  }
}

// ==================== 库存流水 ====================

// 获取库存流水
export const getInventoryLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      skuId,
      type,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = req.query

    const result = await inventoryService.getInventoryLogs({
      skuId: skuId ? parseInt(skuId as string) : undefined,
      type: type as string,
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

// ==================== 序列号管理 ====================

// 获取序列号列表
export const getSerialNumberList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { skuId, status, keyword, page = 1, pageSize = 20 } = req.query

    const result = await inventoryService.getSerialNumberList({
      skuId: skuId ? parseInt(skuId as string) : undefined,
      status: status as string,
      keyword: keyword as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// 录入序列号
export const createSerialNumbers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { skuId, serialNos } = req.body

    if (!skuId) {
      return fail(res, 400, '请选择 SKU')
    }

    if (!serialNos || !Array.isArray(serialNos) || serialNos.length === 0) {
      return fail(res, 400, '请输入序列号')
    }

    const operatorId = req.user!.userId
    const result = await inventoryService.createSerialNumbers(
      {
        skuId: parseInt(skuId),
        serialNos,
      },
      operatorId
    )

    return success(res, result, `成功录入 ${result.count} 个序列号`)
  } catch (error) {
    next(error)
  }
}

// 获取序列号详情（保修查询）
export const getSerialNumberDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { serialNo } = req.params

    if (!serialNo) {
      return fail(res, 400, '请输入序列号')
    }

    const result = await inventoryService.getSerialNumberDetail(serialNo as string)
    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// ==================== 库存预警 ====================

// 获取库存预警列表
export const getInventoryWarning = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { threshold = 10 } = req.query

    const result = await inventoryService.getInventoryWarning({
      threshold: parseInt(threshold as string) || 10,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}
