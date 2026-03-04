import { Request, Response, NextFunction } from 'express'
import { fail } from '../lib/response'
import { Prisma } from '@prisma/client'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err)

  // 如果是 AppError，直接返回自定义错误消息
  if (err instanceof AppError) {
    return fail(res, err.code, err.message)
  }

  // Prisma 错误处理 - 使用 Prisma 错误代码
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      const targetField = (err.meta?.target as string[])?.[0] || '';
      if (targetField.toLowerCase().includes('code')) {
        return fail(res, 400, '编码已存在');
      }
      return fail(res, 400, '数据已存在');
    }
  }

  // 兼容旧格式错误消息
  if (err.message.includes('Unique constraint')) {
    const fieldMatch = err.message.match(/Unique constraint failed on the fields?: \(([^)]+)\)/);
    if (fieldMatch) {
      const field = fieldMatch[1];
      if (field.toLowerCase().includes('code')) {
        return fail(res, 400, '编码已存在');
      }
    }
    return fail(res, 400, '数据已存在');
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
