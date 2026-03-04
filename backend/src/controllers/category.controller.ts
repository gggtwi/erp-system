import { Request, Response, NextFunction } from 'express'
import * as categoryService from '../services/category.service'
import { success, fail } from '../lib/response'

export const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true'
    const categories = await categoryService.getCategoryList(includeInactive)
    return success(res, categories)
  } catch (error) {
    next(error)
  }
}

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的分类ID')
    }
    const category = await categoryService.getCategoryById(id)
    return success(res, category)
  } catch (error) {
    next(error)
  }
}

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, parentId, sort } = req.body

    if (!name || !name.trim()) {
      return fail(res, 400, '分类名称不能为空')
    }

    const category = await categoryService.createCategory({ 
      name: name.trim(), 
      parentId, 
      sort 
    })
    return success(res, category, '创建成功')
  } catch (error) {
    next(error)
  }
}

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的分类ID')
    }
    const category = await categoryService.updateCategory(id, req.body)
    return success(res, category, '更新成功')
  } catch (error) {
    next(error)
  }
}

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的分类ID')
    }
    await categoryService.deleteCategory(id)
    return success(res, null, '删除成功')
  } catch (error) {
    next(error)
  }
}
