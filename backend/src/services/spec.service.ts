import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

export interface CreateSpecTypeDTO {
  name: string
  sort?: number
}

export interface UpdateSpecTypeDTO {
  name?: string
  sort?: number
  active?: boolean
}

// 获取规格类型列表
export const getSpecTypeList = async (includeInactive = false) => {
  const types = await prisma.specType.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  })

  return types
}

// 获取单个规格类型
export const getSpecTypeById = async (id: number) => {
  const type = await prisma.specType.findUnique({
    where: { id },
  })

  if (!type) {
    throw new AppError(404, '规格类型不存在')
  }

  return type
}

// 创建规格类型
export const createSpecType = async (data: CreateSpecTypeDTO) => {
  // 检查名称是否重复
  const existing = await prisma.specType.findFirst({
    where: { name: data.name },
  })

  if (existing) {
    throw new AppError(400, '规格类型名称已存在')
  }

  const type = await prisma.specType.create({
    data: {
      name: data.name,
      sort: data.sort || 0,
    },
  })

  return type
}

// 更新规格类型
export const updateSpecType = async (id: number, data: UpdateSpecTypeDTO) => {
  const type = await prisma.specType.findUnique({
    where: { id },
  })

  if (!type) {
    throw new AppError(404, '规格类型不存在')
  }

  // 检查名称是否重复
  if (data.name && data.name !== type.name) {
    const existing = await prisma.specType.findFirst({
      where: { name: data.name },
    })

    if (existing) {
      throw new AppError(400, '规格类型名称已存在')
    }
  }

  const updated = await prisma.specType.update({
    where: { id },
    data,
  })

  return updated
}

// 删除规格类型
export const deleteSpecType = async (id: number) => {
  const type = await prisma.specType.findUnique({
    where: { id },
  })

  if (!type) {
    throw new AppError(404, '规格类型不存在')
  }

  await prisma.specType.delete({
    where: { id },
  })

  return { success: true }
}

// 获取所有启用的规格类型（用于 SKU 创建时选择）
export const getActiveSpecTypes = async () => {
  const types = await prisma.specType.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  })

  return types
}

// 批量更新排序
export const reorderSpecTypes = async (ids: number[]) => {
  // 使用事务批量更新排序值
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.specType.update({
        where: { id },
        data: { sort: index },
      })
    )
  )

  return { success: true }
}
