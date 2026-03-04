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
  return res.status(code >= 500 ? 500 : 400).json(response)
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
