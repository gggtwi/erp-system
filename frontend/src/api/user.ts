import request from '@/utils/request'

export interface User {
  id: number
  username: string
  name: string
  role: string
  phone?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface UserQuery {
  keyword?: string
  role?: string
  active?: boolean
  page?: number
  pageSize?: number
}

export interface ChangePasswordParams {
  oldPassword?: string
  newPassword: string
}

// 获取用户列表
export function getUsers(params: UserQuery) {
  return request.get<{ list: User[]; total: number; page: number; pageSize: number; totalPages: number }>('/users', { params })
}

// 获取单个用户
export function getUserById(id: number) {
  return request.get<User>(`/users/${id}`)
}

// 修改用户密码
export function changeUserPassword(id: number, data: ChangePasswordParams) {
  return request.put(`/users/${id}/password`, data)
}
