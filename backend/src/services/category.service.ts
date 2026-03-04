import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

export interface CreateCategoryDTO {
  name: string
  parentId?: number
  sort?: number
}

export interface UpdateCategoryDTO {
  name?: string
  parentId?: number
  sort?: number
  active?: boolean
}

const buildTree = (categories: any[], parentId: number | null = null): any[] => {
  return categories
    .filter((c) => c.parentId === parentId)
    .map((c) => ({
      ...c,
      children: buildTree(categories, c.id),
    }))
}

export const getCategoryList = async (includeInactive = false) => {
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  })

  // 构建树形结构
  return buildTree(categories)
}

export const getCategoryById = async (id: number) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
    },
  })

  if (!category) {
    throw new AppError(404, '分类不存在')
  }

  return category
}

export const createCategory = async (data: CreateCategoryDTO) => {
  // 检查父分类是否存在
  if (data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parentId },
    })
    if (!parent) {
      throw new AppError(400, '父分类不存在')
    }
    if (parent.parentId) {
      throw new AppError(400, '最多支持两级分类')
    }
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      parentId: data.parentId,
      sort: data.sort || 0,
    },
  })

  return category
}

export const updateCategory = async (id: number, data: UpdateCategoryDTO) => {
  const category = await prisma.category.findUnique({
    where: { id },
  })

  if (!category) {
    throw new AppError(404, '分类不存在')
  }

  // 检查父分类循环引用
  if (data.parentId === id) {
    throw new AppError(400, '不能将分类设为自己的子分类')
  }

  const updated = await prisma.category.update({
    where: { id },
    data,
  })

  return updated
}

export const deleteCategory = async (id: number) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      children: true,
      products: true,
    },
  })

  if (!category) {
    throw new AppError(404, '分类不存在')
  }

  if (category.children.length > 0) {
    throw new AppError(400, '存在子分类，无法删除')
  }

  if (category.products.length > 0) {
    throw new AppError(400, '存在关联商品，无法删除')
  }

  await prisma.category.delete({
    where: { id },
  })

  return { success: true }
}
