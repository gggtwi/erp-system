import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

export interface ProductQuery {
  keyword?: string
  categoryId?: number
  active?: boolean
  page?: number
  pageSize?: number
}

export interface CreateProductDTO {
  code: string
  name: string
  categoryId: number
  brand?: string
  unit: string
  warranty?: number
}

export interface UpdateProductDTO {
  name?: string
  categoryId?: number
  brand?: string
  unit?: string
  warranty?: number
  active?: boolean
}

export const getProductList = async (query: ProductQuery) => {
  const { keyword, categoryId, active, page = 1, pageSize = 20 } = query

  const where: any = {}

  if (keyword) {
    where.OR = [
      { code: { contains: keyword } },
      { name: { contains: keyword } },
      { brand: { contains: keyword } },
    ]
  }

  if (categoryId) {
    where.categoryId = categoryId
  }

  if (active !== undefined) {
    where.active = active
  }

  const [total, list] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: true,
        skus: {
          where: { active: true },
          include: {
            inventory: true,
          },
        },
      },
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const getProductById = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      skus: {
        include: {
          inventory: true,
        },
      },
    },
  })

  if (!product) {
    throw new AppError(404, '商品不存在')
  }

  return product
}

export const getProductByCode = async (code: string) => {
  const product = await prisma.product.findUnique({
    where: { code },
    include: {
      category: true,
      skus: {
        where: { active: true },
      },
    },
  })

  if (!product) {
    throw new AppError(404, '商品不存在')
  }

  return product
}

export const createProduct = async (data: CreateProductDTO) => {
  // 检查编码是否已存在
  const existing = await prisma.product.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new AppError(400, '商品编码已存在')
  }

  // 检查分类是否存在
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  })

  if (!category) {
    throw new AppError(400, '分类不存在')
  }

  const product = await prisma.product.create({
    data: {
      code: data.code,
      name: data.name,
      categoryId: data.categoryId,
      brand: data.brand,
      unit: data.unit,
      warranty: data.warranty || 12,
    },
    include: {
      category: true,
    },
  })

  return product
}

export const updateProduct = async (id: number, data: UpdateProductDTO) => {
  const product = await prisma.product.findUnique({
    where: { id },
  })

  if (!product) {
    throw new AppError(404, '商品不存在')
  }

  // 如果更改分类，检查分类是否存在
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    })

    if (!category) {
      throw new AppError(400, '分类不存在')
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: {
      category: true,
    },
  })

  return updated
}

export const deleteProduct = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      skus: true,
    },
  })

  if (!product) {
    throw new AppError(404, '商品不存在')
  }

  if (product.skus.length > 0) {
    throw new AppError(400, '存在关联SKU，无法删除')
  }

  await prisma.product.delete({
    where: { id },
  })

  return { success: true }
}
