import { prisma } from '../lib/prisma'

// ==================== 类型定义 ====================

export interface SalesSummaryQuery {
  startDate?: string
  endDate?: string
  groupBy?: 'day' | 'week' | 'month'
}

export interface SalesDetailQuery {
  startDate?: string
  endDate?: string
  customerId?: number
  productId?: number
  categoryId?: number
  page?: number
  pageSize?: number
}

export interface SalesRankingQuery {
  startDate?: string
  endDate?: string
  type?: 'product' | 'customer'
  limit?: number
}

export interface InventorySummaryQuery {
  categoryId?: number
}

export interface InventoryWarningQuery {
  threshold?: number
}

export interface ReceivableReportQuery {
  startDate?: string
  endDate?: string
  customerId?: number
  status?: string
}

export interface ProfitAnalysisQuery {
  startDate?: string
  endDate?: string
  groupBy?: 'day' | 'week' | 'month'
}

// ==================== 销售报表 ====================

/**
 * 销售汇总报表（按日/周/月）
 */
export const getSalesSummary = async (query: SalesSummaryQuery) => {
  const { startDate, endDate, groupBy = 'day' } = query

  // 默认最近30天
  const end = endDate ? new Date(endDate) : new Date()
  end.setHours(23, 59, 59, 999)
  
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  start.setHours(0, 0, 0, 0)

  // 获取时间范围内的所有销售订单
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
      status: { in: ['confirmed', 'completed'] },
    },
    select: {
      createdAt: true,
      totalAmount: true,
      discountAmount: true,
      paidAmount: true,
      debtAmount: true,
      items: {
        select: {
          quantity: true,
          amount: true,
        },
      },
    },
  })

  // 按日期分组统计
  const groupedData: Record<string, {
    date: string
    orderCount: number
    totalAmount: number
    discountAmount: number
    paidAmount: number
    debtAmount: number
    itemCount: number
  }> = {}

  for (const sale of sales) {
    let dateKey: string
    
    if (groupBy === 'day') {
      dateKey = sale.createdAt.toISOString().slice(0, 10)
    } else if (groupBy === 'week') {
      const date = new Date(sale.createdAt)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      dateKey = weekStart.toISOString().slice(0, 10)
    } else {
      dateKey = sale.createdAt.toISOString().slice(0, 7)
    }

    if (!groupedData[dateKey]) {
      groupedData[dateKey] = {
        date: dateKey,
        orderCount: 0,
        totalAmount: 0,
        discountAmount: 0,
        paidAmount: 0,
        debtAmount: 0,
        itemCount: 0,
      }
    }

    groupedData[dateKey].orderCount++
    groupedData[dateKey].totalAmount += sale.totalAmount
    groupedData[dateKey].discountAmount += sale.discountAmount
    groupedData[dateKey].paidAmount += sale.paidAmount
    groupedData[dateKey].debtAmount += sale.debtAmount
    groupedData[dateKey].itemCount += sale.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  // 转换为数组并排序
  const list = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date))

  // 计算总计
  const summary = {
    orderCount: list.reduce((sum, item) => sum + item.orderCount, 0),
    totalAmount: list.reduce((sum, item) => sum + item.totalAmount, 0),
    discountAmount: list.reduce((sum, item) => sum + item.discountAmount, 0),
    paidAmount: list.reduce((sum, item) => sum + item.paidAmount, 0),
    debtAmount: list.reduce((sum, item) => sum + item.debtAmount, 0),
    itemCount: list.reduce((sum, item) => sum + item.itemCount, 0),
  }

  return {
    summary,
    list,
    groupBy,
    dateRange: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
  }
}

/**
 * 销售明细报表
 */
export const getSalesDetail = async (query: SalesDetailQuery) => {
  const {
    startDate,
    endDate,
    customerId,
    productId,
    categoryId,
    page = 1,
    pageSize = 20,
  } = query

  const where: any = {
    status: { in: ['confirmed', 'completed'] },
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

  if (customerId) {
    where.customerId = customerId
  }

  // 获取销售明细
  const [total, items] = await Promise.all([
    prisma.saleItem.count({
      where: {
        sale: where,
        ...(productId && { sku: { productId } }),
        ...(categoryId && { sku: { product: { categoryId } } }),
      },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: where,
        ...(productId && { sku: { productId } }),
        ...(categoryId && { sku: { product: { categoryId } } }),
      },
      include: {
        sale: {
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
                phone: true,
              },
            },
            operator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        sku: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { sale: { createdAt: 'desc' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  // 计算利润
  const list = items.map((item) => ({
    id: item.id,
    saleId: item.saleId,
    orderNo: item.sale.orderNo,
    createdAt: item.sale.createdAt,
    customer: item.sale.customer,
    operator: item.sale.operator,
    product: {
      id: item.sku.productId,
      code: item.sku.product.code,
      name: item.sku.product.name,
      category: item.sku.product.category.name,
    },
    sku: {
      id: item.skuId,
      code: item.sku.code,
      name: item.sku.name,
    },
    quantity: item.quantity,
    price: item.price,
    amount: item.amount,
    costPrice: item.sku.costPrice,
    costAmount: item.sku.costPrice * item.quantity,
    profit: item.amount - item.sku.costPrice * item.quantity,
    serialNo: item.serialNo,
  }))

  // 统计汇总
  const summary = {
    totalQuantity: list.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: list.reduce((sum, item) => sum + item.amount, 0),
    totalCost: list.reduce((sum, item) => sum + item.costAmount, 0),
    totalProfit: list.reduce((sum, item) => sum + item.profit, 0),
  }

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    summary,
  }
}

/**
 * 销售排行榜
 */
export const getSalesRanking = async (query: SalesRankingQuery) => {
  const { startDate, endDate, type = 'product', limit = 10 } = query

  // 默认最近30天
  const end = endDate ? new Date(endDate) : new Date()
  end.setHours(23, 59, 59, 999)
  
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  start.setHours(0, 0, 0, 0)

  if (type === 'product') {
    // 商品销售排行
    const items = await prisma.saleItem.findMany({
      where: {
        sale: {
          createdAt: { gte: start, lte: end },
          status: { in: ['confirmed', 'completed'] },
        },
      },
      include: {
        sku: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })

    // 按SKU分组统计
    const skuStats: Record<number, {
      skuId: number
      skuCode: string
      skuName: string
      productId: number
      productCode: string
      productName: string
      categoryName: string
      totalQuantity: number
      totalAmount: number
      orderCount: number
    }> = {}

    for (const item of items) {
      const skuId = item.skuId
      if (!skuStats[skuId]) {
        skuStats[skuId] = {
          skuId,
          skuCode: item.sku.code,
          skuName: item.sku.name,
          productId: item.sku.productId,
          productCode: item.sku.product.code,
          productName: item.sku.product.name,
          categoryName: item.sku.product.category.name,
          totalQuantity: 0,
          totalAmount: 0,
          orderCount: 0,
        }
      }
      skuStats[skuId].totalQuantity += item.quantity
      skuStats[skuId].totalAmount += item.amount
      skuStats[skuId].orderCount++
    }

    // 排序并取前N名
    const list = Object.values(skuStats)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }))

    return {
      type: 'product',
      list,
      dateRange: {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      },
    }
  } else {
    // 客户销售排行
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: ['confirmed', 'completed'] },
      },
      include: {
        customer: true,
        items: true,
      },
    })

    // 按客户分组统计
    const customerStats: Record<number, {
      customerId: number
      customerCode: string
      customerName: string
      phone: string
      totalAmount: number
      totalPaid: number
      totalDebt: number
      orderCount: number
      itemCount: number
    }> = {}

    for (const sale of sales) {
      const customerId = sale.customerId
      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          customerId,
          customerCode: sale.customer.code,
          customerName: sale.customer.name,
          phone: sale.customer.phone || '',
          totalAmount: 0,
          totalPaid: 0,
          totalDebt: 0,
          orderCount: 0,
          itemCount: 0,
        }
      }
      customerStats[customerId].totalAmount += sale.totalAmount
      customerStats[customerId].totalPaid += sale.paidAmount
      customerStats[customerId].totalDebt += sale.debtAmount
      customerStats[customerId].orderCount++
      customerStats[customerId].itemCount += sale.items.reduce((sum, item) => sum + item.quantity, 0)
    }

    // 排序并取前N名
    const list = Object.values(customerStats)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }))

    return {
      type: 'customer',
      list,
      dateRange: {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      },
    }
  }
}

// ==================== 库存报表 ====================

/**
 * 库存汇总报表
 */
export const getInventorySummary = async (query: InventorySummaryQuery) => {
  const { categoryId } = query

  const where: any = { active: true }
  if (categoryId) {
    where.product = { categoryId }
  }

  // 获取所有SKU和库存
  const skus = await prisma.sKU.findMany({
    where,
    include: {
      product: {
        include: { category: true },
      },
      inventory: true,
    },
  })

  // 统计数据
  const totalSkus = skus.length
  const totalQuantity = skus.reduce((sum, sku) => sum + (sku.inventory?.quantity || 0), 0)
  const totalCost = skus.reduce(
    (sum, sku) => sum + (sku.inventory?.quantity || 0) * sku.costPrice,
    0
  )
  const totalValue = skus.reduce(
    (sum, sku) => sum + (sku.inventory?.quantity || 0) * sku.price,
    0
  )

  // 按分类统计
  const categoryStats: Record<number, {
    categoryId: number
    categoryName: string
    skuCount: number
    totalQuantity: number
    totalCost: number
    totalValue: number
  }> = {}

  for (const sku of skus) {
    const catId = sku.product.categoryId
    if (!categoryStats[catId]) {
      categoryStats[catId] = {
        categoryId: catId,
        categoryName: sku.product.category.name,
        skuCount: 0,
        totalQuantity: 0,
        totalCost: 0,
        totalValue: 0,
      }
    }
    categoryStats[catId].skuCount++
    categoryStats[catId].totalQuantity += sku.inventory?.quantity || 0
    categoryStats[catId].totalCost += (sku.inventory?.quantity || 0) * sku.costPrice
    categoryStats[catId].totalValue += (sku.inventory?.quantity || 0) * sku.price
  }

  // 库存状态统计
  const outOfStock = skus.filter((sku) => !sku.inventory || sku.inventory.quantity === 0).length
  const lowStock = skus.filter(
    (sku) => sku.inventory && sku.inventory.quantity > 0 && sku.inventory.quantity <= 10
  ).length
  const normalStock = skus.filter(
    (sku) => sku.inventory && sku.inventory.quantity > 10
  ).length

  return {
    summary: {
      totalSkus,
      totalQuantity,
      totalCost,
      totalValue,
      outOfStock,
      lowStock,
      normalStock,
    },
    byCategory: Object.values(categoryStats).sort((a, b) => b.totalValue - a.totalValue),
  }
}

/**
 * 库存预警报表
 */
export const getInventoryWarning = async (query: InventoryWarningQuery) => {
  const { threshold = 10 } = query

  const inventories = await prisma.inventory.findMany({
    where: {
      quantity: { lte: threshold },
    },
    include: {
      sku: {
        include: {
          product: {
            include: { category: true },
          },
        },
      },
    },
    orderBy: { quantity: 'asc' },
  })

  const list = inventories.map((inv) => ({
    skuId: inv.skuId,
    skuCode: inv.sku.code,
    skuName: inv.sku.name,
    productId: inv.sku.productId,
    productCode: inv.sku.product.code,
    productName: inv.sku.product.name,
    categoryName: inv.sku.product.category.name,
    quantity: inv.quantity,
    threshold,
    shortage: Math.max(0, threshold - inv.quantity),
    costPrice: inv.sku.costPrice,
    price: inv.sku.price,
  }))

  // 统计
  const summary = {
    totalItems: list.length,
    outOfStock: list.filter((item) => item.quantity === 0).length,
    lowStock: list.filter((item) => item.quantity > 0).length,
    totalShortage: list.reduce((sum, item) => sum + item.shortage, 0),
    estimatedCost: list.reduce((sum, item) => sum + item.shortage * item.costPrice, 0),
  }

  return {
    list,
    summary,
    threshold,
  }
}

// ==================== 财务报表 ====================

/**
 * 应收账款报表
 */
export const getReceivableReport = async (query: ReceivableReportQuery) => {
  const { startDate, endDate, customerId, status } = query

  const where: any = {}

  if (customerId) {
    where.customerId = customerId
  }

  if (status) {
    where.status = status
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

  const receivables = await prisma.receivable.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          creditLimit: true,
          balance: true,
        },
      },
      sale: {
        select: {
          orderNo: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
            },
          },
        },
      },
      payments: {
        select: {
          amount: true,
          method: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // 计算剩余金额和账龄
  const now = new Date()
  const list = receivables.map((r) => {
    const remainingAmount = r.amount - r.paidAmount
    const days = Math.floor((now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    
    let agingBucket = '0-30'
    if (days > 90) agingBucket = '90+'
    else if (days > 60) agingBucket = '61-90'
    else if (days > 30) agingBucket = '31-60'

    return {
      id: r.id,
      saleId: r.saleId,
      orderNo: r.sale.orderNo,
      customer: r.customer,
      amount: r.amount,
      paidAmount: r.paidAmount,
      remainingAmount,
      status: r.status,
      createdAt: r.createdAt,
      dueDate: r.dueDate,
      days,
      agingBucket,
      paymentCount: r.payments.length,
    }
  })

  // 统计汇总
  const summary = {
    totalAmount: receivables.reduce((sum, r) => sum + r.amount, 0),
    totalPaid: receivables.reduce((sum, r) => sum + r.paidAmount, 0),
    totalRemaining: receivables.reduce((sum, r) => sum + (r.amount - r.paidAmount), 0),
    count: receivables.length,
    byStatus: {
      unpaid: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
    },
    byAging: {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    },
  }

  for (const item of list) {
    summary.byStatus[item.status as keyof typeof summary.byStatus].count++
    summary.byStatus[item.status as keyof typeof summary.byStatus].amount += item.remainingAmount
    summary.byAging[item.agingBucket as keyof typeof summary.byAging].count++
    summary.byAging[item.agingBucket as keyof typeof summary.byAging].amount += item.remainingAmount
  }

  return {
    list,
    summary,
  }
}

/**
 * 利润分析报表
 */
export const getProfitAnalysis = async (query: ProfitAnalysisQuery) => {
  const { startDate, endDate, groupBy = 'day' } = query

  // 默认最近30天
  const end = endDate ? new Date(endDate) : new Date()
  end.setHours(23, 59, 59, 999)
  
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  start.setHours(0, 0, 0, 0)

  // 获取销售订单及明细
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: { in: ['confirmed', 'completed'] },
    },
    include: {
      items: {
        include: {
          sku: true,
        },
      },
    },
  })

  // 获取采购入库成本
  const purchases = await prisma.purchase.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: 'confirmed',
    },
    include: {
      items: true,
    },
  })

  // 按日期分组统计
  const groupedData: Record<string, {
    date: string
    revenue: number
    costOfGoods: number
    grossProfit: number
    purchaseAmount: number
    orderCount: number
  }> = {}

  // 处理销售收入
  for (const sale of sales) {
    let dateKey: string
    
    if (groupBy === 'day') {
      dateKey = sale.createdAt.toISOString().slice(0, 10)
    } else if (groupBy === 'week') {
      const date = new Date(sale.createdAt)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      dateKey = weekStart.toISOString().slice(0, 10)
    } else {
      dateKey = sale.createdAt.toISOString().slice(0, 7)
    }

    if (!groupedData[dateKey]) {
      groupedData[dateKey] = {
        date: dateKey,
        revenue: 0,
        costOfGoods: 0,
        grossProfit: 0,
        purchaseAmount: 0,
        orderCount: 0,
      }
    }

    const saleCost = sale.items.reduce((sum, item) => sum + item.sku.costPrice * item.quantity, 0)
    const saleRevenue = sale.totalAmount - sale.discountAmount

    groupedData[dateKey].revenue += saleRevenue
    groupedData[dateKey].costOfGoods += saleCost
    groupedData[dateKey].grossProfit += saleRevenue - saleCost
    groupedData[dateKey].orderCount++
  }

  // 处理采购成本
  for (const purchase of purchases) {
    let dateKey: string
    
    if (groupBy === 'day') {
      dateKey = purchase.createdAt.toISOString().slice(0, 10)
    } else if (groupBy === 'week') {
      const date = new Date(purchase.createdAt)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      dateKey = weekStart.toISOString().slice(0, 10)
    } else {
      dateKey = purchase.createdAt.toISOString().slice(0, 7)
    }

    if (!groupedData[dateKey]) {
      groupedData[dateKey] = {
        date: dateKey,
        revenue: 0,
        costOfGoods: 0,
        grossProfit: 0,
        purchaseAmount: 0,
        orderCount: 0,
      }
    }

    groupedData[dateKey].purchaseAmount += purchase.totalAmount
  }

  // 转换为数组并排序
  const list = Object.values(groupedData)
    .map((item) => ({
      ...item,
      profitMargin: item.revenue > 0 ? (item.grossProfit / item.revenue * 100) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 计算总计
  const summary = {
    totalRevenue: list.reduce((sum, item) => sum + item.revenue, 0),
    totalCostOfGoods: list.reduce((sum, item) => sum + item.costOfGoods, 0),
    totalGrossProfit: list.reduce((sum, item) => sum + item.grossProfit, 0),
    totalPurchaseAmount: list.reduce((sum, item) => sum + item.purchaseAmount, 0),
    totalOrders: list.reduce((sum, item) => sum + item.orderCount, 0),
    averageProfitMargin: 0,
  }

  summary.averageProfitMargin = summary.totalRevenue > 0 
    ? (summary.totalGrossProfit / summary.totalRevenue * 100) 
    : 0

  return {
    summary,
    list,
    groupBy,
    dateRange: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
  }
}
