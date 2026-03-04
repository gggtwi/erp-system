import { Request, Response, NextFunction } from 'express'
import * as customerService from '../services/customer.service'
import { success, fail } from '../lib/response'

// 获取客户列表
export const getList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyword, status, page = 1, pageSize = 20 } = req.query

    const result = await customerService.getCustomerList({
      keyword: keyword as string,
      status: status as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// 获取客户详情
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的客户ID')
    }
    const customer = await customerService.getCustomerById(id)
    return success(res, customer)
  } catch (error) {
    next(error)
  }
}

// 创建客户
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, name, phone, address, creditLimit } = req.body

    if (!code || !code.trim()) {
      return fail(res, 400, '客户编码不能为空')
    }
    if (!name || !name.trim()) {
      return fail(res, 400, '客户名称不能为空')
    }

    const customer = await customerService.createCustomer({
      code: code.trim(),
      name: name.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      creditLimit,
    })

    return success(res, customer, '创建成功')
  } catch (error) {
    next(error)
  }
}

// 更新客户
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的客户ID')
    }

    const customer = await customerService.updateCustomer(id, req.body)
    return success(res, customer, '更新成功')
  } catch (error) {
    next(error)
  }
}

// 获取客户购买历史
export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的客户ID')
    }

    const { page = 1, pageSize = 20 } = req.query

    const result = await customerService.getCustomerHistory(id, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// 获取客户欠款信息
export const getDebt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的客户ID')
    }

    const result = await customerService.getCustomerDebt(id)
    return success(res, result)
  } catch (error) {
    next(error)
  }
}

// 删除客户
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) {
      return fail(res, 400, '无效的客户ID')
    }

    await customerService.deleteCustomer(id)
    return success(res, { success: true }, '删除成功')
  } catch (error) {
    next(error)
  }
}
