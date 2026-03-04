import { Request, Response, NextFunction } from 'express'
import * as userService from '../services/user.service'
import { success, fail, paginate } from '../lib/response'

// 获取用户列表
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyword, role, active, page = 1, pageSize = 20 } = req.query

    const result = await userService.getUsers({
      keyword: keyword as string,
      role: role as string,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      page: Number(page),
      pageSize: Number(pageSize),
    })

    return paginate(res, result.list, result.total, result.page, result.pageSize)
  } catch (error) {
    next(error)
  }
}

// 获取单个用户
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const user = await userService.getUserById(Number(id))
    return success(res, user)
  } catch (error) {
    next(error)
  }
}

// 修改用户密码
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { oldPassword, newPassword } = req.body
    const operatorId = req.user!.userId
    const operatorRole = req.user!.role

    await userService.changeUserPassword(Number(id), operatorId, operatorRole, {
      oldPassword,
      newPassword,
    })

    return success(res, null, '密码修改成功')
  } catch (error) {
    next(error)
  }
}

// 创建用户
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, name, role, password, phone, active } = req.body
    const operatorRole = req.user!.role

    const user = await userService.createUser(operatorRole, {
      username,
      name,
      role,
      password,
      phone,
      active,
    })

    return success(res, user, '用户创建成功')
  } catch (error) {
    next(error)
  }
}

// 获取可创建的角色列表
export const getCreatableRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operatorRole = req.user!.role
    const roles = userService.getCreatableRoles(operatorRole)
    return success(res, roles)
  } catch (error) {
    next(error)
  }
}
