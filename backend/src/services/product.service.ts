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
  categoryId?: number
  categoryName?: string
  brand?: string
  unit: string
  warranty?: number
}

export interface UpdateProductDTO {
  name?: string
  categoryId?: number
  categoryName?: string
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

  // 处理分类：支持 categoryId（数字）或 categoryName（字符串）
  let categoryId = data.categoryId
  
  if (!categoryId && data.categoryName) {
    // 查找或创建分类
    let category = await prisma.category.findFirst({
      where: { name: data.categoryName },
    })
    
    if (!category) {
      // 创建新分类
      category = await prisma.category.create({
        data: {
          name: data.categoryName,
          sort: 0,
        },
      })
    }
    
    categoryId = category.id
  }

  if (!categoryId) {
    throw new AppError(400, '请选择或输入分类')
  }

  // 检查分类是否存在
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  })

  if (!category) {
    throw new AppError(400, '分类不存在')
  }

  const product = await prisma.product.create({
    data: {
      code: data.code,
      name: data.name,
      categoryId: categoryId,
      brand: data.brand,
      unit: data.unit,
      warranty: data.warranty || 12,
    },
    include: {
      category: true,
    },
  })

  // 自动创建默认 SKU
  await prisma.sKU.create({
    data: {
      productId: product.id,
      code: `${data.code}-001`,
      name: '默认规格',
      price: 0,
      costPrice: 0,
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

  // 处理分类：支持 categoryId 或 categoryName
  let categoryId = data.categoryId
  
  if (!categoryId && data.categoryName) {
    // 查找或创建分类
    let category = await prisma.category.findFirst({
      where: { name: data.categoryName },
    })
    
    if (!category) {
      // 创建新分类
      category = await prisma.category.create({
        data: {
          name: data.categoryName,
          sort: 0,
        },
      })
    }
    
    categoryId = category.id
  }

  // 如果更改分类，检查分类是否存在
  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      throw new AppError(400, '分类不存在')
    }
  }

  const updateData: any = { ...data }
  if (categoryId) {
    updateData.categoryId = categoryId
  }
  // 删除 categoryName，因为不是数据库字段
  delete updateData.categoryName

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
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
      skus: {
        include: {
          saleItems: true,
          purchaseItems: true,
        },
      },
    },
  })

  if (!product) {
    throw new AppError(404, '商品不存在')
  }

  // 检查是否有销售记录
  const hasSaleItems = product.skus.some(sku => sku.saleItems.length > 0)
  if (hasSaleItems) {
    throw new AppError(400, '该商品的 SKU 已有销售记录，无法删除')
  }

  // 检查是否有采购记录
  const hasPurchaseItems = product.skus.some(sku => sku.purchaseItems.length > 0)
  if (hasPurchaseItems) {
    throw new AppError(400, '该商品的 SKU 已有采购记录，无法删除')
  }

  // 使用事务级联删除
  await prisma.$transaction(async (tx) => {
    for (const sku of product.skus) {
      // 删除库存日志
      await tx.inventoryLog.deleteMany({
        where: { skuId: sku.id },
      })
      
      // 删除序列号
      await tx.serialNumber.deleteMany({
        where: { skuId: sku.id },
      })
      
      // 删除库存
      await tx.inventory.deleteMany({
        where: { skuId: sku.id },
      })
      
      // 删除 SKU
      await tx.sKU.delete({
        where: { id: sku.id },
      })
    }
    
    // 删除商品
    await tx.product.delete({
      where: { id },
    })
  })

  return { success: true }
}
