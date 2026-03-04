import { Request, Response, NextFunction } from 'express'
import * as skuService from '../services/sku.service'
import { success, fail } from '../lib/response'

export const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, keyword, active, page = 1, pageSize = 20 } = req.query

    const result = await skuService.getSKUList({
      productId: productId ? parseInt(productId as string) : undefined,
      keyword: keyword as string,
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
      return fail(res, 400, '无效的SKU ID')
    }
    const sku = await skuService.getSKUById(id)
    return success(res, sku)
  } catch (error) {
    next(error)
  }
}

export const getByCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code as string
    if (!code) {
      return fail(res, 400, 'SKU编码不能为空')
    }
    const sku = await skuService.getSKUByCode(code)
    return success(res, sku)
  } catch (error) {
    next(error)
  }
}

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, code, name, specs, price, costPrice, barcode } = req.body

    if (!productId) {
      return fail(res, 400, '请选择商品')
    }
    if (!code || !code.trim()) {
      return fail(res, 400, 'SKU编码不能为空')
    }
    if (!name || !name.trim()) {
      return fail(res, 400, 'SKU名称不能为空')
    }
    if (price === undefined || price < 0) {
      return fail(res, 400, '请输入有效的销售价格')
    }
    if (costPrice === undefined || costPrice < 0) {
      return fail(res, 400, '请输入有效的成本价格')
    }

    const sku = await skuService.createSKU({
      productId,
      code: code.trim(),
      name: name.trim(),
      specs,
      price: parseFloat(price),
      costPrice: parseFloat(costPrice),
      barcode,
    })

    return success(res, sku, '创建成功')
  } catch (error) {
    next(error)
  }
}

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的SKU ID')
    }

    const data: any = {}
    if (req.body.name) data.name = req.body.name.trim()
    if (req.body.specs !== undefined) data.specs = req.body.specs
    if (req.body.price !== undefined) data.price = parseFloat(req.body.price)
    if (req.body.costPrice !== undefined) data.costPrice = parseFloat(req.body.costPrice)
    if (req.body.barcode !== undefined) data.barcode = req.body.barcode
    if (req.body.active !== undefined) data.active = req.body.active

    const sku = await skuService.updateSKU(id, data)
    return success(res, sku, '更新成功')
  } catch (error) {
    next(error)
  }
}

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的SKU ID')
    }
    await skuService.deleteSKU(id)
    return success(res, null, '删除成功')
  } catch (error) {
    next(error)
  }
}

export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的SKU ID')
    }
    const inventory = await skuService.getSKUInventory(id)
    return success(res, inventory)
  } catch (error) {
    next(error)
  }
}

export const adjustInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的SKU ID')
    }

    const { quantity, type, remark } = req.body

    if (!quantity || quantity <= 0) {
      return fail(res, 400, '请输入有效的数量')
    }

    if (!['in', 'out', 'adjust'].includes(type)) {
      return fail(res, 400, '无效的调整类型')
    }

    const operatorId = req.user!.userId
    const result = await skuService.adjustInventory(id, quantity, type, operatorId, remark)
    return success(res, result, '库存调整成功')
  } catch (error) {
    next(error)
  }
}
