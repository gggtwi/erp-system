import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { login as loginApi, logout as logoutApi, getCurrentUser } from '@/api/auth'
import type { LoginParams } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const userInfo = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.name || userInfo.value?.username || '')
  const role = computed(() => userInfo.value?.role || '')

  // 登录
  async function login(params: LoginParams) {
    const result = await loginApi(params)
    token.value = result.token
    userInfo.value = result.user
    localStorage.setItem('token', result.token)
    return result
  }

  // 登出
  async function logout() {
    try {
      await logoutApi()
    } catch (e) {
      // ignore
    } finally {
      token.value = null
      userInfo.value = null
      localStorage.removeItem('token')
    }
  }

  // 获取用户信息
  async function fetchUserInfo() {
    if (!token.value) return null
    try {
      const user = await getCurrentUser()
      userInfo.value = user
      return user
    } catch (e) {
      token.value = null
      localStorage.removeItem('token')
      return null
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    username,
    role,
    login,
    logout,
    fetchUserInfo,
  }
})
