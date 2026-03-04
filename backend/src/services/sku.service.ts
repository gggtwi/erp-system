import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

export interface SKUQuery {
  productId?: number
  keyword?: string
  active?: boolean
  page?: number
  pageSize?: number
}

export interface CreateSKUDTO {
  productId: number
  code: string
  name: string
  specs?: string
  price: number
  costPrice: number
  barcode?: string
}

export interface UpdateSKUDTO {
  name?: string
  specs?: string
  price?: number
  costPrice?: number
  barcode?: string
  active?: boolean
}

export const getSKUList = async (query: SKUQuery) => {
  const { productId, keyword, active, page = 1, pageSize = 20 } = query

  const where: any = {}

  if (productId) {
    where.productId = productId
  }

  if (keyword) {
    where.OR = [
      { code: { contains: keyword } },
      { name: { contains: keyword } },
    ]
  }

  if (active !== undefined) {
    where.active = active
  }

  const [total, list] = await Promise.all([
    prisma.sKU.count({ where }),
    prisma.sKU.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
          },
        },
        inventory: true,
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

export const getSKUById = async (id: number) => {
  const sku = await prisma.sKU.findUnique({
    where: { id },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      inventory: true,
      serialNumbers: {
        where: { status: 'in_stock' },
        take: 100,
      },
    },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  return sku
}

export const getSKUByCode = async (code: string) => {
  const sku = await prisma.sKU.findUnique({
    where: { code },
    include: {
      product: true,
      inventory: true,
    },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  return sku
}

export const createSKU = async (data: CreateSKUDTO) => {
  // 价格校验：必须大于 0
  if (data.price <= 0) {
    throw new AppError(400, '销售价格必须大于0')
  }
  if (data.costPrice <= 0) {
    throw new AppError(400, '成本价格必须大于0')
  }

  // 检查编码是否已存在
  const existing = await prisma.sKU.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new AppError(400, 'SKU编码已存在')
  }

  // 检查商品是否存在
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  })

  if (!product) {
    throw new AppError(400, '商品不存在')
  }

  // 创建 SKU 并初始化库存
  const sku = await prisma.sKU.create({
    data: {
      productId: data.productId,
      code: data.code,
      name: data.name,
      specs: data.specs,
      price: data.price,
      costPrice: data.costPrice,
      barcode: data.barcode,
    },
    include: {
      product: true,
    },
  })

  // 初始化库存记录
  await prisma.inventory.create({
    data: {
      skuId: sku.id,
      quantity: 0,
      lockedQty: 0,
    },
  })

  return sku
}

export const updateSKU = async (id: number, data: UpdateSKUDTO) => {
  const sku = await prisma.sKU.findUnique({
    where: { id },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  // 价格校验：如果更新价格，必须大于 0
  if (data.price !== undefined && data.price <= 0) {
    throw new AppError(400, '销售价格必须大于0')
  }
  if (data.costPrice !== undefined && data.costPrice <= 0) {
    throw new AppError(400, '成本价格必须大于0')
  }

  const updated = await prisma.sKU.update({
    where: { id },
    data,
    include: {
      product: true,
    },
  })

  return updated
}

export const deleteSKU = async (id: number) => {
  const sku = await prisma.sKU.findUnique({
    where: { id },
    include: {
      inventory: true,
      serialNumbers: true,
      saleItems: true,
      purchaseItems: true,
    },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  // 检查是否有库存
  if (sku.inventory && sku.inventory.quantity > 0) {
    throw new AppError(400, '存在库存，无法删除')
  }

  // 检查是否有关联销售
  if (sku.saleItems.length > 0) {
    throw new AppError(400, '存在关联销售记录，无法删除')
  }

  // 检查是否有关联采购
  if (sku.purchaseItems.length > 0) {
    throw new AppError(400, '存在关联采购记录，无法删除')
  }

  // 删除库存记录和SKU
  await prisma.$transaction([
    prisma.inventory.deleteMany({ where: { skuId: id } }),
    prisma.sKU.delete({ where: { id } }),
  ])

  return { success: true }
}

// 获取 SKU 库存信息
export const getSKUInventory = async (id: number) => {
  const sku = await prisma.sKU.findUnique({
    where: { id },
    include: {
      product: true,
      inventory: true,
    },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  return {
    skuId: sku.id,
    skuCode: sku.code,
    skuName: sku.name,
    productCode: sku.product.code,
    productName: sku.product.name,
    quantity: sku.inventory?.quantity || 0,
    lockedQty: sku.inventory?.lockedQty || 0,
    availableQty: (sku.inventory?.quantity || 0) - (sku.inventory?.lockedQty || 0),
  }
}

// 调整库存
export const adjustInventory = async (
  skuId: number,
  quantity: number,
  type: 'in' | 'out' | 'adjust',
  operatorId: number,
  remark?: string
) => {
  const sku = await prisma.sKU.findUnique({
    where: { id: skuId },
    include: { inventory: true },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  const inventory = sku.inventory
  if (!inventory) {
    throw new AppError(400, '库存记录不存在')
  }

  const beforeQty = inventory.quantity
  let afterQty: number

  switch (type) {
    case 'in':
      afterQty = beforeQty + quantity
      break
    case 'out':
      afterQty = beforeQty - quantity
      if (afterQty < 0) {
        throw new AppError(400, '库存不足')
      }
      break
    case 'adjust':
      afterQty = quantity
      break
    default:
      throw new AppError(400, '无效的调整类型')
  }

  await prisma.$transaction([
    prisma.inventory.update({
      where: { skuId },
      data: { quantity: afterQty },
    }),
    prisma.inventoryLog.create({
      data: {
        skuId,
        type,
        quantity: type === 'adjust' ? afterQty - beforeQty : quantity,
        beforeQty,
        afterQty,
        refType: 'adjust',
        operatorId,
        remark,
      },
    }),
  ])

  return {
    beforeQty,
    afterQty,
    change: afterQty - beforeQty,
  }
}
