import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

// ==================== 类型定义 ====================

export interface ReceivableQuery {
  keyword?: string
  customerId?: number
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface PaymentQuery {
  keyword?: string
  customerId?: number
  method?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface CreatePaymentDTO {
  receivableId: number
  amount: number
  method: string
  remark?: string
}

// ==================== 应收账款服务 ====================

/**
 * 获取应收账款列表
 */
export const getReceivableList = async (query: ReceivableQuery) => {
  const {
    keyword,
    customerId,
    status,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = query

  const where: any = {}

  if (keyword) {
    where.OR = [
      { sale: { orderNo: { contains: keyword } } },
      { customer: { name: { contains: keyword } } },
      { customer: { phone: { contains: keyword } } },
    ]
  }

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

  const [total, list] = await Promise.all([
    prisma.receivable.count({ where }),
    prisma.receivable.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
          },
        },
        sale: {
          select: {
            id: true,
            orderNo: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  // 计算剩余金额
  const listWithRemaining = list.map((item) => ({
    ...item,
    remainingAmount: item.amount - item.paidAmount,
  }))

  return {
    list: listWithRemaining,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * 获取应收账款详情
 */
export const getReceivableById = async (id: number) => {
  const receivable = await prisma.receivable.findUnique({
    where: { id },
    include: {
      customer: true,
      sale: {
        include: {
          items: {
            include: {
              sku: {
                include: {
                  product: true,
                },
              },
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
      payments: {
        include: {
          operator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!receivable) {
    throw new AppError(404, '应收账款不存在')
  }

  return {
    ...receivable,
    remainingAmount: receivable.amount - receivable.paidAmount,
  }
}

/**
 * 获取客户欠款详情
 */
export const getCustomerDebt = async (customerId: number) => {
  // 获取客户信息
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  })

  if (!customer) {
    throw new AppError(404, '客户不存在')
  }

  // 获取该客户所有未结清的应收账款
  const receivables = await prisma.receivable.findMany({
    where: {
      customerId,
      status: { in: ['unpaid', 'partial'] },
    },
    include: {
      sale: {
        select: {
          orderNo: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // 计算统计数据
  const totalReceivable = receivables.reduce((sum, r) => sum + r.amount, 0)
  const totalPaid = receivables.reduce((sum, r) => sum + r.paidAmount, 0)
  const totalRemaining = receivables.reduce((sum, r) => sum + (r.amount - r.paidAmount), 0)

  // 按账龄分组（0-30天，31-60天，61-90天，90天以上）
  const now = new Date()
  const agingBuckets = {
    '0-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    '90+': { count: 0, amount: 0 },
  }

  for (const r of receivables) {
    const days = Math.floor((now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const remaining = r.amount - r.paidAmount

    if (days <= 30) {
      agingBuckets['0-30'].count++
      agingBuckets['0-30'].amount += remaining
    } else if (days <= 60) {
      agingBuckets['31-60'].count++
      agingBuckets['31-60'].amount += remaining
    } else if (days <= 90) {
      agingBuckets['61-90'].count++
      agingBuckets['61-90'].amount += remaining
    } else {
      agingBuckets['90+'].count++
      agingBuckets['90+'].amount += remaining
    }
  }

  return {
    customer: {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      phone: customer.phone,
      creditLimit: customer.creditLimit,
      balance: customer.balance,
      availableCredit: customer.creditLimit - customer.balance,
    },
    summary: {
      totalReceivable,
      totalPaid,
      totalRemaining,
      receivableCount: receivables.length,
    },
    aging: agingBuckets,
    receivables: receivables.map((r) => ({
      id: r.id,
      saleId: r.saleId,
      orderNo: r.sale.orderNo,
      amount: r.amount,
      paidAmount: r.paidAmount,
      remainingAmount: r.amount - r.paidAmount,
      status: r.status,
      createdAt: r.createdAt,
      dueDate: r.dueDate,
    })),
  }
}

/**
 * 获取应收账款统计
 */
export const getReceivableStats = async () => {
  // 获取所有应收账款（用于计算累计已收款）
  const allReceivables = await prisma.receivable.findMany({
    select: {
      amount: true,
      paidAmount: true,
      status: true,
      customerId: true,
    },
  })

  // 获取未结清的应收账款
  const activeReceivables = allReceivables.filter(
    r => r.status === 'unpaid' || r.status === 'partial'
  )

  // 应收总额 = 当前未结清的应收账款金额
  const totalAmount = activeReceivables.reduce((sum, r) => sum + r.amount, 0)
  // 已收款 = 所有应收账款的已收款（累积，包括已结清的）
  const totalPaid = allReceivables.reduce((sum, r) => sum + r.paidAmount, 0)
  // 欠款金额 = 未结清应收账款的剩余金额
  const totalRemaining = activeReceivables.reduce(
    (sum, r) => sum + (r.amount - r.paidAmount),
    0
  )

  // 统计欠款客户数
  const debtCustomerIds = new Set<number>()
  for (const r of activeReceivables) {
    debtCustomerIds.add(r.customerId)
  }
  const debtCustomerCount = debtCustomerIds.size

  // 按状态统计
  const byStatus = {
    unpaid: { count: 0, amount: 0 },
    partial: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
  }

  for (const r of allReceivables) {
    byStatus[r.status as keyof typeof byStatus].count++
    byStatus[r.status as keyof typeof byStatus].amount += r.amount - r.paidAmount
  }

  return {
    totalAmount,
    totalPaid,
    totalRemaining,
    debtCustomerCount,
    byStatus,
  }
}

// ==================== 收款服务 ====================

/**
 * 创建收款记录（核心业务：收款核销）
 */
export const createPayment = async (data: CreatePaymentDTO, operatorId: number) => {
  const { receivableId, amount, method, remark } = data

  // 1. 校验应收账款
  const receivable = await prisma.receivable.findUnique({
    where: { id: receivableId },
    include: {
      customer: true,
      sale: true,
    },
  })

  if (!receivable) {
    throw new AppError(404, '应收账款不存在')
  }

  // 2. 校验应收账款状态
  if (receivable.status === 'paid') {
    throw new AppError(400, '该应收账款已结清')
  }

  // 3. 校验收款金额
  const remainingAmount = receivable.amount - receivable.paidAmount
  if (amount <= 0) {
    throw new AppError(400, '收款金额必须大于0')
  }
  if (amount > remainingAmount) {
    throw new AppError(400, `收款金额超出剩余金额，剩余金额: ${remainingAmount.toFixed(2)}`)
  }

  // 4. 使用事务处理收款
  const payment = await prisma.$transaction(async (tx) => {
    // 创建收款记录
    const newPayment = await tx.payment.create({
      data: {
        receivableId,
        customerId: receivable.customerId,
        amount,
        method,
        remark,
        operatorId,
      },
    })

    // 计算新的已收金额和状态
    const newPaidAmount = receivable.paidAmount + amount
    const newStatus = newPaidAmount >= receivable.amount ? 'paid' : 'partial'

    // 更新应收账款
    await tx.receivable.update({
      where: { id: receivableId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    })

    // 更新客户欠款余额
    await tx.customer.update({
      where: { id: receivable.customerId },
      data: {
        balance: { decrement: amount },
      },
    })

    // 如果应收账款结清，更新销售订单的支付状态
    if (newStatus === 'paid') {
      await tx.sale.update({
        where: { id: receivable.saleId },
        data: { 
          paymentStatus: 'paid',
          paidAmount: receivable.amount,  // 已付金额 = 应收账款总额
          debtAmount: 0,  // 欠款金额 = 0
        },
      })
    } else {
      // 部分支付，更新为 partial，同时更新已付金额和欠款金额
      await tx.sale.update({
        where: { id: receivable.saleId },
        data: { 
          paymentStatus: 'partial',
          paidAmount: newPaidAmount,  // 更新已付金额
          debtAmount: receivable.amount - newPaidAmount,  // 更新欠款金额
        },
      })
    }

    return newPayment
  })

  // 返回完整的收款记录
  return getPaymentById(payment.id)
}

/**
 * 获取收款记录详情
 */
export const getPaymentById = async (id: number) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
        },
      },
      receivable: {
        include: {
          sale: {
            select: {
              id: true,
              orderNo: true,
            },
          },
        },
      },
      operator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!payment) {
    throw new AppError(404, '收款记录不存在')
  }

  return payment
}

/**
 * 获取收款记录列表
 */
export const getPaymentList = async (query: PaymentQuery) => {
  const {
    keyword,
    customerId,
    method,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = query

  const where: any = {}

  if (keyword) {
    where.OR = [
      { receivable: { sale: { orderNo: { contains: keyword } } } },
      { customer: { name: { contains: keyword } } },
      { customer: { phone: { contains: keyword } } },
      { remark: { contains: keyword } },
    ]
  }

  if (customerId) {
    where.customerId = customerId
  }

  if (method) {
    where.method = method
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
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
          },
        },
        receivable: {
          include: {
            sale: {
              select: {
                id: true,
                orderNo: true,
              },
            },
          },
        },
        operator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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

/**
 * 获取收款统计
 */
export const getPaymentStats = async (startDate?: string, endDate?: string) => {
  const where: any = {}

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

  // 获取所有收款记录
  const payments = await prisma.payment.findMany({
    where,
    select: {
      amount: true,
      method: true,
      createdAt: true,
    },
  })

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalCount = payments.length

  // 按支付方式统计
  const byMethod: Record<string, { count: number; amount: number }> = {
    cash: { count: 0, amount: 0 },
    wechat: { count: 0, amount: 0 },
    alipay: { count: 0, amount: 0 },
    bank: { count: 0, amount: 0 },
  }

  for (const p of payments) {
    if (byMethod[p.method]) {
      byMethod[p.method].count++
      byMethod[p.method].amount += p.amount
    }
  }

  // 按日期统计（最近7天）
  const dailyStats: { date: string; count: number; amount: number }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const dayPayments = payments.filter((p) => {
      const pDate = new Date(p.createdAt)
      return pDate >= date && pDate < nextDate
    })

    dailyStats.push({
      date: date.toISOString().slice(0, 10),
      count: dayPayments.length,
      amount: dayPayments.reduce((sum, p) => sum + p.amount, 0),
    })
  }

  return {
    totalAmount,
    totalCount,
    byMethod,
    dailyStats,
  }
}
