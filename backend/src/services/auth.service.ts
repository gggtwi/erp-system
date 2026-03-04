import { prisma } from '../lib/prisma'
import { comparePassword } from '../lib/password'
import { generateToken } from '../lib/jwt'
import { AppError } from '../middlewares/error'
import { hashPassword } from '../lib/password'

export interface LoginDTO {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: {
    id: number
    username: string
    name: string
    role: string
  }
}

export const login = async (data: LoginDTO): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({
    where: { username: data.username },
  })

  if (!user) {
    throw new AppError(401, '用户名或密码错误')
  }

  if (!user.active) {
    throw new AppError(401, '账户已被禁用')
  }

  const isMatch = await comparePassword(data.password, user.password)
  if (!isMatch) {
    throw new AppError(401, '用户名或密码错误')
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  })

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  }
}

export const getCurrentUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      phone: true,
      active: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw new AppError(404, '用户不存在')
  }

  return user
}

export const changePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new AppError(404, '用户不存在')
  }

  const isMatch = await comparePassword(oldPassword, user.password)
  if (!isMatch) {
    throw new AppError(400, '原密码错误')
  }

  const hashedPassword = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })

  return { success: true }
}
