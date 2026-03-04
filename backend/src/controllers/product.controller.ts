import { Request, Response, NextFunction } from 'express'
import * as productService from '../services/product.service'
import { success, fail, paginate } from '../lib/response'

export const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyword, categoryId, active, page = 1, pageSize = 20 } = req.query

    const result = await productService.getProductList({
      keyword: keyword as string,
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的商品ID')
    }
    const product = await productService.getProductById(id)
    return success(res, product)
  } catch (error) {
    next(error)
  }
}

export const getByCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code as string
    if (!code) {
      return fail(res, 400, '商品编码不能为空')
    }
    const product = await productService.getProductByCode(code)
    return success(res, product)
  } catch (error) {
    next(error)
  }
}

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, name, categoryId, categoryName, brand, unit, warranty } = req.body

    if (!code || !code.trim()) {
      return fail(res, 400, '商品编码不能为空')
    }
    if (!name || !name.trim()) {
      return fail(res, 400, '商品名称不能为空')
    }
    if (!categoryId && !categoryName) {
      return fail(res, 400, '请选择或输入分类')
    }
    if (!unit || !unit.trim()) {
      return fail(res, 400, '单位不能为空')
    }

    const product = await productService.createProduct({
      code: code.trim(),
      name: name.trim(),
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      categoryName: categoryName?.trim(),
      brand: brand?.trim(),
      unit: unit.trim(),
      warranty,
    })

    return success(res, product, '创建成功')
  } catch (error) {
    next(error)
  }
}

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的商品ID')
    }

    const product = await productService.updateProduct(id, req.body)
    return success(res, product, '更新成功')
  } catch (error) {
    next(error)
  }
}

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的商品ID')
    }
    await productService.deleteProduct(id)
    return success(res, null, '删除成功')
  } catch (error) {
    next(error)
  }
}
