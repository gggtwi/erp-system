import { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.service'
import { success, fail } from '../lib/response'

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return fail(res, 400, '用户名和密码不能为空')
    }

    const result = await authService.login({ username, password })
    return success(res, result, '登录成功')
  } catch (error) {
    next(error)
  }
}

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId
    const user = await authService.getCurrentUser(userId)
    return success(res, user)
  } catch (error) {
    next(error)
  }
}

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return fail(res, 400, '原密码和新密码不能为空')
    }

    if (newPassword.length < 6) {
      return fail(res, 400, '新密码长度不能少于6位')
    }

    await authService.changePassword(userId, oldPassword, newPassword)
    return success(res, null, '密码修改成功')
  } catch (error) {
    next(error)
  }
}
