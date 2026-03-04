import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

// ==================== 库存查询 ====================

export interface InventoryQuery {
  keyword?: string
  categoryId?: number
  lowStock?: boolean
  warningThreshold?: number
  page?: number
  pageSize?: number
}

export interface InventoryLogQuery {
  skuId?: number
  type?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface SerialNumberQuery {
  skuId?: number
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}

// 获取库存列表
export const getInventoryList = async (query: InventoryQuery) => {
  const {
    keyword,
    categoryId,
    lowStock,
    warningThreshold = 10,
    page = 1,
    pageSize = 20,
  } = query

  const where: any = {
    active: true,
  }

  // 关键词搜索
  if (keyword) {
    where.OR = [
      { code: { contains: keyword } },
      { name: { contains: keyword } },
      { product: { name: { contains: keyword } } },
    ]
  }

  // 分类筛选
  if (categoryId) {
    where.product = { categoryId }
  }

  // 获取 SKU 列表及库存信息
  const skus = await prisma.sKU.findMany({
    where,
    include: {
      product: {
        include: { category: true },
      },
      inventory: true,
    },
    orderBy: [{ id: 'desc' }],
  })

  // 处理库存数据
  let list = skus.map((sku) => ({
    skuId: sku.id,
    skuCode: sku.code,
    skuName: sku.name,
    specs: sku.specs, // 规格（颜色等）
    productId: sku.productId,
    productCode: sku.product.code,
    productName: sku.product.name,
    categoryId: sku.product.categoryId,
    categoryName: sku.product.category.name,
    unit: sku.product.unit,
    price: sku.price,
    costPrice: sku.costPrice,
    quantity: sku.inventory?.quantity || 0,
    lockedQty: sku.inventory?.lockedQty || 0,
    availableQty:
      (sku.inventory?.quantity || 0) - (sku.inventory?.lockedQty || 0),
    isLowStock:
      (sku.inventory?.quantity || 0) <= warningThreshold &&
      (sku.inventory?.quantity || 0) > 0,
    isOutOfStock: (sku.inventory?.quantity || 0) === 0,
  }))

  // 低库存筛选
  if (lowStock === true) {
    list = list.filter((item) => item.isLowStock || item.isOutOfStock)
  }

  const total = list.length
  const totalPages = Math.ceil(total / pageSize)

  // 分页
  const startIndex = (page - 1) * pageSize
  const paginatedList = list.slice(startIndex, startIndex + pageSize)

  return {
    list: paginatedList,
    total,
    page,
    pageSize,
    totalPages,
  }
}

// 获取库存详情
export const getInventoryDetail = async (skuId: number) => {
  const sku = await prisma.sKU.findUnique({
    where: { id: skuId },
    include: {
      product: {
        include: { category: true },
      },
      inventory: true,
      serialNumbers: {
        where: { status: 'in_stock' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  // 获取最近库存流水
  const recentLogs = await prisma.inventoryLog.findMany({
    where: { skuId },
    include: {
      operator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return {
    skuId: sku.id,
    skuCode: sku.code,
    skuName: sku.name,
    specs: sku.specs,
    productId: sku.productId,
    productCode: sku.product.code,
    productName: sku.product.name,
    category: sku.product.category,
    unit: sku.product.unit,
    warranty: sku.product.warranty,
    price: sku.price,
    costPrice: sku.costPrice,
    quantity: sku.inventory?.quantity || 0,
    lockedQty: sku.inventory?.lockedQty || 0,
    availableQty: (sku.inventory?.quantity || 0) - (sku.inventory?.lockedQty || 0),
    serialNumbers: sku.serialNumbers,
    recentLogs,
  }
}

// ==================== 库存操作 ====================

export interface AdjustInventoryDTO {
  skuId: number
  quantity: number
  type: 'in' | 'out' | 'adjust'
  remark?: string
}

// 库存调整
export const adjustInventory = async (
  data: AdjustInventoryDTO,
  operatorId: number
) => {
  const { skuId, quantity, type, remark } = data

  const sku = await prisma.sKU.findUnique({
    where: { id: skuId },
    include: { inventory: true },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  if (!sku.active) {
    throw new AppError(400, 'SKU已禁用')
  }

  const beforeQty = sku.inventory?.quantity || 0
  let afterQty: number

  switch (type) {
    case 'in':
      afterQty = beforeQty + quantity
      break
    case 'out':
      afterQty = beforeQty - quantity
      if (afterQty < 0) {
        throw new AppError(400, '库存不足，无法出库')
      }
      break
    case 'adjust':
      afterQty = quantity
      if (afterQty < 0) {
        throw new AppError(400, '库存不能为负数')
      }
      break
    default:
      throw new AppError(400, '无效的调整类型')
  }

  await prisma.$transaction([
    prisma.inventory.upsert({
      where: { skuId },
      update: { quantity: afterQty },
      create: { skuId, quantity: afterQty, lockedQty: 0 },
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
    skuId,
    skuCode: sku.code,
    skuName: sku.name,
    beforeQty,
    afterQty,
    change: afterQty - beforeQty,
  }
}

// ==================== 库存流水 ====================

// 获取库存流水列表
export const getInventoryLogs = async (query: InventoryLogQuery) => {
  const {
    skuId,
    type,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = query

  const where: any = {}

  if (skuId) {
    where.skuId = skuId
  }

  if (type) {
    where.type = type
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  const [total, list] = await Promise.all([
    prisma.inventoryLog.count({ where }),
    prisma.inventoryLog.findMany({
      where,
      include: {
        sku: {
          include: {
            product: { include: { category: true } },
          },
        },
        operator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    list: list.map((log) => ({
      id: log.id,
      skuId: log.skuId,
      skuCode: log.sku.code,
      skuName: log.sku.name,
      productId: log.sku.productId,
      productName: log.sku.product.name,
      categoryName: log.sku.product.category.name,
      type: log.type,
      typeText: log.type === 'in' ? '入库' : log.type === 'out' ? '出库' : '盘点',
      quantity: log.quantity,
      beforeQty: log.beforeQty,
      afterQty: log.afterQty,
      refType: log.refType,
      refId: log.refId,
      remark: log.remark,
      operator: log.operator,
      createdAt: log.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ==================== 序列号管理 ====================

export interface CreateSerialNumberDTO {
  skuId: number
  serialNos: string[]
}

// 批量录入序列号
export const createSerialNumbers = async (
  data: CreateSerialNumberDTO,
  operatorId: number
) => {
  const { skuId, serialNos } = data

  if (!serialNos || serialNos.length === 0) {
    throw new AppError(400, '请输入序列号')
  }

  const sku = await prisma.sKU.findUnique({
    where: { id: skuId },
    include: { product: true, inventory: true },
  })

  if (!sku) {
    throw new AppError(404, 'SKU不存在')
  }

  // 去重
  const uniqueSerialNos = [...new Set(serialNos.map((s) => s.trim()).filter(Boolean))]

  if (uniqueSerialNos.length === 0) {
    throw new AppError(400, '序列号不能为空')
  }

  // 检查是否已存在
  const existing = await prisma.serialNumber.findMany({
    where: {
      skuId,
      serialNo: { in: uniqueSerialNos },
    },
  })

  if (existing.length > 0) {
    const existingNos = existing.map((s) => s.serialNo).join(', ')
    throw new AppError(400, `以下序列号已存在: ${existingNos}`)
  }

  // 计算保修到期日
  const warrantyMonths = sku.product.warranty || 12
  const warrantyExp = new Date()
  warrantyExp.setMonth(warrantyExp.getMonth() + warrantyMonths)

  // 批量创建序列号
  const created = await prisma.$transaction(
    uniqueSerialNos.map((serialNo) =>
      prisma.serialNumber.create({
        data: {
          skuId,
          serialNo,
          status: 'in_stock',
          warrantyExp,
        },
      })
    )
  )

  // 自动增加库存
  const currentQty = sku.inventory?.quantity || 0
  const newQty = currentQty + created.length

  await prisma.$transaction([
    prisma.inventory.upsert({
      where: { skuId },
      update: { quantity: newQty },
      create: { skuId, quantity: newQty, lockedQty: 0 },
    }),
    prisma.inventoryLog.create({
      data: {
        skuId,
        type: 'in',
        quantity: created.length,
        beforeQty: currentQty,
        afterQty: newQty,
        refType: 'serial_import',
        operatorId,
        remark: `录入序列号: ${uniqueSerialNos.slice(0, 5).join(', ')}${uniqueSerialNos.length > 5 ? '...' : ''}`,
      },
    }),
  ])

  return {
    count: created.length,
    serialNos: uniqueSerialNos,
    warrantyExp,
    newQuantity: newQty,
  }
}

// 获取序列号列表
export const getSerialNumberList = async (query: SerialNumberQuery) => {
  const { skuId, status, keyword, page = 1, pageSize = 20 } = query

  const where: any = {}

  if (skuId) {
    where.skuId = skuId
  }

  if (status) {
    where.status = status
  }

  if (keyword) {
    where.serialNo = { contains: keyword }
  }

  const [total, list] = await Promise.all([
    prisma.serialNumber.count({ where }),
    prisma.serialNumber.findMany({
      where,
      include: {
        sku: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    list: list.map((sn) => ({
      id: sn.id,
      serialNo: sn.serialNo,
      skuId: sn.skuId,
      skuCode: sn.sku.code,
      skuName: sn.sku.name,
      productId: sn.sku.productId,
      productName: sn.sku.product.name,
      categoryName: sn.sku.product.category.name,
      status: sn.status,
      statusText:
        sn.status === 'in_stock'
          ? '在库'
          : sn.status === 'sold'
          ? '已售'
          : '已退货',
      saleId: sn.saleId,
      warrantyExp: sn.warrantyExp,
      createdAt: sn.createdAt,
      soldAt: sn.soldAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// 获取序列号详情（保修查询）
export const getSerialNumberDetail = async (serialNo: string) => {
  const sn = await prisma.serialNumber.findFirst({
    where: { serialNo },
    include: {
      sku: {
        include: {
          product: { include: { category: true } },
        },
      },
    },
  })

  if (!sn) {
    throw new AppError(404, '序列号不存在')
  }

  // 如果已售，获取销售信息
  let saleInfo = null
  if (sn.saleId) {
    const sale = await prisma.sale.findUnique({
      where: { id: sn.saleId },
      include: {
        customer: true,
        operator: { select: { id: true, name: true } },
      },
    })
    if (sale) {
      saleInfo = {
        orderNo: sale.orderNo,
        customer: sale.customer,
        soldAt: sn.soldAt,
        operator: sale.operator,
      }
    }
  }

  // 计算保修状态
  const now = new Date()
  const warrantyExpired = sn.warrantyExp ? sn.warrantyExp < now : false
  const warrantyDaysLeft = sn.warrantyExp
    ? Math.max(0, Math.ceil((sn.warrantyExp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return {
    serialNo: sn.serialNo,
    status: sn.status,
    statusText:
      sn.status === 'in_stock'
        ? '在库'
        : sn.status === 'sold'
        ? '已售'
        : '已退货',
    product: {
      id: sn.sku.productId,
      code: sn.sku.product.code,
      name: sn.sku.product.name,
      category: sn.sku.product.category.name,
      unit: sn.sku.product.unit,
    },
    sku: {
      id: sn.skuId,
      code: sn.sku.code,
      name: sn.sku.name,
      specs: sn.sku.specs,
    },
    warranty: {
      months: sn.sku.product.warranty,
      expDate: sn.warrantyExp,
      expired: warrantyExpired,
      daysLeft: warrantyDaysLeft,
    },
    sale: saleInfo,
    createdAt: sn.createdAt,
    soldAt: sn.soldAt,
  }
}

// ==================== 库存统计 ====================

export interface InventoryStats {
  totalProducts: number
  totalSkus: number
  warningCount: number
  totalValue: number
}

// 获取库存统计
export const getInventoryStats = async (warningThreshold = 10): Promise<InventoryStats> => {
  // 商品总数
  const totalProducts = await prisma.product.count({ where: { active: true } })
  
  // SKU 总数
  const totalSkus = await prisma.sKU.count({ where: { active: true } })
  
  // 库存预警数量
  const warningCount = await prisma.inventory.count({
    where: {
      quantity: { lte: warningThreshold },
    },
  })
  
  // 库存总值（按成本价计算）
  const inventories = await prisma.inventory.findMany({
    include: {
      sku: { select: { costPrice: true } },
    },
  })
  const totalValue = inventories.reduce((sum, inv) => {
    return sum + inv.quantity * (inv.sku?.costPrice || 0)
  }, 0)
  
  return {
    totalProducts,
    totalSkus,
    warningCount,
    totalValue,
  }
}

// ==================== 库存预警 ====================

export interface WarningConfig {
  threshold?: number
}

// 获取库存预警列表
export const getInventoryWarning = async (config: WarningConfig = {}) => {
  const { threshold = 10 } = config

  const inventories = await prisma.inventory.findMany({
    where: {
      quantity: { lte: threshold },
    },
    include: {
      sku: {
        include: {
          product: { include: { category: true } },
        },
      },
    },
    orderBy: { quantity: 'asc' },
  })

  return inventories.map((inv) => ({
    skuId: inv.skuId,
    skuCode: inv.sku.code,
    skuName: inv.sku.name,
    specs: inv.sku.specs,
    productId: inv.sku.productId,
    productCode: inv.sku.product.code,
    productName: inv.sku.product.name,
    categoryName: inv.sku.product.category.name,
    price: inv.sku.price,
    costPrice: inv.sku.costPrice,
    quantity: inv.quantity,
    threshold,
    shortage: threshold - inv.quantity,
  }))
}
