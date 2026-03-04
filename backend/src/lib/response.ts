import { Response } from 'express'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export const success = <T>(res: Response, data?: T, message = 'success') => {
  const response: ApiResponse<T> = {
    code: 0,
    message,
    data,
  }
  return res.json(response)
}

export const fail = (res: Response, code: number, message: string) => {
  const response: ApiResponse = {
    code,
    message,
  }
  // 使用业务码作为 HTTP 状态码，但限制在有效的 HTTP 状态码范围内
  const httpStatus = code >= 400 && code < 600 ? code : 400
  return res.status(httpStatus).json(response)
}

export const paginate = <T>(
  res: Response,
  list: T[],
  total: number,
  page: number,
  pageSize: number
) => {
  return success(res, {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}
