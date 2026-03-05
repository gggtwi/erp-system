import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

export interface ProductQuery {
  keyword?: string
  categoryId?: number
  active?: boolean
  page?: number
  pageSize?: number
}

export interface CreateSKUDTO {
  code: string
  name: string
  specs?: string
  price: number
  costPrice: number
  barcode?: string
  warningThreshold?: number
}

export interface CreateProductDTO {
  code: string
  name: string
  categoryId?: number
  categoryName?: string
  brand?: string
  unit: string
  warranty?: number
  skus?: CreateSKUDTO[]
}

export interface UpdateSKUDTO {
  id?: number          // 有 id 表示更新，无 id 表示新增
  code: string
  name: string
  specs?: string
  price: number
  costPrice: number
  barcode?: string
  warningThreshold?: number
  active?: boolean
  _delete?: boolean    // 标记删除
}

export interface UpdateProductDTO {
  name?: string
  categoryId?: number
  categoryName?: string
  brand?: string
  unit?: string
  warranty?: number
  active?: boolean
  skus?: UpdateSKUDTO[]  // SKU 列表（支持增删改）
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

  // 创建商品
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

  // 创建 SKU
  if (data.skus && data.skus.length > 0) {
    // 用户提供了 SKU 列表
    for (let i = 0; i < data.skus.length; i++) {
      const skuData = data.skus[i]
      await prisma.sKU.create({
        data: {
          productId: product.id,
          code: skuData.code || `${data.code}-${String(i + 1).padStart(3, '0')}`,
          name: skuData.name || `${product.name}-规格${i + 1}`,
          specs: skuData.specs,
          price: skuData.price || 0,
          costPrice: skuData.costPrice || 0,
          barcode: skuData.barcode,
          warningThreshold: skuData.warningThreshold,
        },
      })
    }
  } else {
    // 没有提供 SKU，自动创建默认 SKU
    await prisma.sKU.create({
      data: {
        productId: product.id,
        code: `${data.code}-001`,
        name: '默认规格',
        price: 0,
        costPrice: 0,
      },
    })
  }

  return product
}

export const updateProduct = async (id: number, data: UpdateProductDTO) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { skus: true },
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

  // 准备更新数据
  const updateData: any = { ...data }
  if (categoryId) {
    updateData.categoryId = categoryId
  }
  // 删除 categoryName 和 skus，单独处理
  delete updateData.categoryName
  delete updateData.skus

  // 处理 SKU 更新
  if (data.skus && data.skus.length > 0) {
    const existingSkuIds = new Set(product.skus.map(s => s.id))
    const existingSkuCodes = new Set(product.skus.map(s => s.code))
    
    // 分类 SKU 操作
    const skusToCreate: any[] = []
    const skusToUpdate: { where: { id: number }; data: any }[] = []
    const skusToDelete: { id: number }[] = []

    for (const sku of data.skus) {
      if (sku._delete && sku.id) {
        // 标记删除
        skusToDelete.push({ id: sku.id })
      } else if (sku.id && existingSkuIds.has(sku.id)) {
        // 更新现有 SKU
        const { id, _delete, ...skuData } = sku
        skusToUpdate.push({
          where: { id: sku.id! },
          data: skuData,
        })
      } else if (!sku.id) {
        // 新增 SKU - 检查编码是否已被其他商品使用
        const existingSku = await prisma.sKU.findUnique({
          where: { code: sku.code },
        })
        
        if (existingSku && existingSku.productId !== id) {
          throw new AppError(400, `SKU 编码 "${sku.code}" 已被其他商品使用`)
        }
        
        // 如果编码存在于当前商品，按更新处理
        if (existingSku && existingSku.productId === id) {
          const { id: skuId, _delete, ...skuData } = sku
          skusToUpdate.push({
            where: { id: existingSku.id },
            data: skuData,
          })
        } else {
          const { id, _delete, ...skuData } = sku
          skusToCreate.push(skuData)
        }
      }
    }

    // 使用事务执行更新
    const updated = await prisma.$transaction(async (tx) => {
      // 更新商品基本信息
      await tx.product.update({
        where: { id },
        data: updateData,
      })

      // 删除标记的 SKU
      for (const skuToDelete of skusToDelete) {
        await tx.sKU.delete({
          where: { id: skuToDelete.id },
        })
      }

      // 更新现有 SKU
      for (const updateOp of skusToUpdate) {
        await tx.sKU.update(updateOp)
      }

      // 创建新 SKU
      for (const newSku of skusToCreate) {
        await tx.sKU.create({
          data: {
            productId: id,
            code: newSku.code,
            name: newSku.name,
            specs: newSku.specs,
            price: newSku.price,
            costPrice: newSku.costPrice,
            barcode: newSku.barcode,
            warningThreshold: newSku.warningThreshold,
            active: newSku.active ?? true,
          },
        })
      }

      // 重新获取更新后的商品（包含所有 SKU）
      return await tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          skus: true,
        },
      })
    })

    return updated
  }

  // 没有 SKU 更新，直接更新商品
  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      skus: true,
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
