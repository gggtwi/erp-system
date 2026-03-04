import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'
import { fail } from '../lib/response'

export interface AuthUser {
  userId: number
  username: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 401, '未登录')
  }

  const token = authHeader.replace('Bearer ', '')
  const decoded = verifyToken(token)

  if (!decoded) {
    return fail(res, 401, 'Token 无效或已过期')
  }

  req.user = decoded
  next()
}

export const rbacMiddleware = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, '无权限访问')
    }
    next()
  }
}
