import { prisma } from '../lib/prisma'
import { hashPassword, comparePassword } from '../lib/password'
import { AppError } from '../middlewares/error'

export interface UserListQuery {
  keyword?: string
  role?: string
  active?: boolean
  page: number
  pageSize: number
}

export interface ChangePasswordDTO {
  oldPassword?: string
  newPassword: string
}

export interface CreateUserDTO {
  username: string
  name: string
  role: string
  password: string
  phone?: string
  active?: boolean
}

// 角色列表
export const ROLES = ['super_admin', 'admin', 'finance', 'sales', 'warehouse', 'purchase']

// 检查角色是否可以创建目标角色
export const canCreateRole = (operatorRole: string, targetRole: string): boolean => {
  // 超级管理员可以创建任何角色
  if (operatorRole === 'super_admin') {
    return ROLES.includes(targetRole)
  }
  // 普通管理员可以创建除超级管理员外的角色
  if (operatorRole === 'admin') {
    return ROLES.includes(targetRole) && targetRole !== 'super_admin'
  }
  // 其他角色不能创建任何账号
  return false
}

// 获取可创建的角色列表
export const getCreatableRoles = (operatorRole: string): string[] => {
  if (operatorRole === 'super_admin') {
    return ROLES
  }
  if (operatorRole === 'admin') {
    return ROLES.filter(r => r !== 'super_admin')
  }
  return []
}

// 获取用户列表
export const getUsers = async (query: UserListQuery) => {
  const { keyword, role, active, page, pageSize } = query
  const skip = (page - 1) * pageSize

  const where: any = {}

  if (keyword) {
    where.OR = [
      { username: { contains: keyword } },
      { name: { contains: keyword } },
    ]
  }

  if (role) {
    where.role = role
  }

  if (active !== undefined) {
    where.active = active
  }

  const [list, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: pageSize,
      orderBy: { id: 'asc' },
    }),
    prisma.user.count({ where }),
  ])

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// 获取单个用户
export const getUserById = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      phone: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new AppError(404, '用户不存在')
  }

  return user
}

// 修改密码
export const changeUserPassword = async (
  targetUserId: number,
  operatorId: number,
  operatorRole: string,
  data: ChangePasswordDTO
) => {
  const { oldPassword, newPassword } = data

  // 验证新密码
  if (!newPassword) {
    throw new AppError(400, '新密码不能为空')
  }

  if (newPassword.length < 6) {
    throw new AppError(400, '新密码长度不能少于6位')
  }

  // 获取目标用户
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  })

  if (!targetUser) {
    throw new AppError(404, '用户不存在')
  }

  // 权限检查
  const isSelf = targetUserId === operatorId
  const isSuperAdmin = operatorRole === 'super_admin'
  const isAdmin = operatorRole === 'admin'

  if (isSuperAdmin) {
    // 超级管理员可以修改任何用户密码，无需旧密码
    // 直接修改
  } else if (isAdmin) {
    // 管理员可以修改其他用户和自己的密码
    // 修改自己需要旧密码验证
    if (isSelf) {
      if (!oldPassword) {
        throw new AppError(400, '修改自己密码需要提供旧密码')
      }
      const isMatch = await comparePassword(oldPassword, targetUser.password)
      if (!isMatch) {
        throw new AppError(400, '旧密码错误')
      }
    }
    // 修改其他用户不需要旧密码
  } else {
    // 其他角色只能修改自己密码，需要旧密码验证
    if (!isSelf) {
      throw new AppError(403, '无权限修改其他用户密码')
    }
    if (!oldPassword) {
      throw new AppError(400, '修改密码需要提供旧密码')
    }
    const isMatch = await comparePassword(oldPassword, targetUser.password)
    if (!isMatch) {
      throw new AppError(400, '旧密码错误')
    }
  }

  // 加密新密码
  const hashedPassword = await hashPassword(newPassword)

  // 更新密码
  await prisma.user.update({
    where: { id: targetUserId },
    data: { password: hashedPassword },
  })

  return { success: true }
}

// 创建用户
export const createUser = async (
  operatorRole: string,
  data: CreateUserDTO
) => {
  const { username, name, role, password, phone, active } = data

  // 验证必填字段
  if (!username || !username.trim()) {
    throw new AppError(400, '用户名不能为空')
  }
  if (!name || !name.trim()) {
    throw new AppError(400, '姓名不能为空')
  }
  if (!role) {
    throw new AppError(400, '请选择角色')
  }
  if (!password) {
    throw new AppError(400, '密码不能为空')
  }

  // 验证密码长度
  if (password.length < 6) {
    throw new AppError(400, '密码长度不能少于6位')
  }

  // 验证角色是否有效
  if (!ROLES.includes(role)) {
    throw new AppError(400, '无效的角色')
  }

  // 权限检查
  if (!canCreateRole(operatorRole, role)) {
    if (operatorRole === 'admin' && role === 'super_admin') {
      throw new AppError(403, '您没有权限创建超级管理员账号')
    }
    throw new AppError(403, '您没有权限创建用户')
  }

  // 检查用户名是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { username: username.trim() },
  })

  if (existingUser) {
    throw new AppError(400, '用户名已存在')
  }

  // 加密密码
  const hashedPassword = await hashPassword(password)

  // 创建用户
  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      name: name.trim(),
      role,
      password: hashedPassword,
      phone: phone?.trim() || null,
      active: active !== undefined ? active : true,
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      phone: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}
