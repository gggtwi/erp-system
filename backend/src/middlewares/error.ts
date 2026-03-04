import { Request, Response, NextFunction } from 'express'
import { fail } from '../lib/response'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err)

  // Prisma 错误处理
  if (err.message.includes('Unique constraint')) {
    return fail(res, 400, '数据已存在')
  }

  if (err.message.includes('Foreign key constraint')) {
    return fail(res, 400, '关联数据不存在')
  }

  return fail(res, 500, process.env.NODE_ENV === 'production' ? '服务器错误' : err.message)
}

export class AppError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export const throwError = (code: number, message: string) => {
  throw new AppError(code, message)
}
