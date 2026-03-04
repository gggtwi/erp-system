import request from '@/utils/request'
import type { User } from '@/types'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: User
}

// 登录
export function login(params: LoginParams) {
  return request.post<LoginResult>('/auth/login', params)
}

// 登出
export function logout() {
  return request.post('/auth/logout')
}

// 获取当前用户信息
export function getCurrentUser() {
  return request.get<User>('/auth/me')
}

// 修改密码
export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request.put('/auth/password', data)
}
