import { Request, Response, NextFunction } from 'express'
import * as specService from '../services/spec.service'
import { success, fail } from '../lib/response'

// 获取规格类型列表
export const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true'
    const types = await specService.getSpecTypeList(includeInactive)
    return success(res, types)
  } catch (error) {
    next(error)
  }
}

// 获取单个规格类型
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的规格类型ID')
    }
    const type = await specService.getSpecTypeById(id)
    return success(res, type)
  } catch (error) {
    next(error)
  }
}

// 创建规格类型
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, sort } = req.body

    if (!name || !name.trim()) {
      return fail(res, 400, '规格类型名称不能为空')
    }

    const type = await specService.createSpecType({
      name: name.trim(),
      sort,
    })
    return success(res, type, '创建成功')
  } catch (error) {
    next(error)
  }
}

// 更新规格类型
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的规格类型ID')
    }
    const type = await specService.updateSpecType(id, req.body)
    return success(res, type, '更新成功')
  } catch (error) {
    next(error)
  }
}

// 删除规格类型
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的规格类型ID')
    }
    await specService.deleteSpecType(id)
    return success(res, null, '删除成功')
  } catch (error) {
    next(error)
  }
}

// 获取所有启用的规格类型（用于 SKU 创建时选择）
export const getActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await specService.getActiveSpecTypes()
    return success(res, types)
  } catch (error) {
    next(error)
  }
}

// 批量更新排序
export const reorder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return fail(res, 400, '无效的规格类型ID列表')
    }

    await specService.reorderSpecTypes(ids)
    return success(res, null, '排序已更新')
  } catch (error) {
    next(error)
  }
}
