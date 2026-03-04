import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

export interface CustomerQuery {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface CreateCustomerDTO {
  code: string
  name: string
  phone?: string
  address?: string
  creditLimit?: number
}

export interface UpdateCustomerDTO {
  name?: string
  phone?: string
  address?: string
  creditLimit?: number
  status?: string
}

// 获取客户列表
export const getCustomerList = async (query: CustomerQuery) => {
  const { keyword, status, page = 1, pageSize = 20 } = query

  const where: any = {}

  if (keyword) {
    where.OR = [
      { code: { contains: keyword } },
      { name: { contains: keyword } },
      { phone: { contains: keyword } },
    ]
  }

  if (status) {
    where.status = status
  }

  const [total, list] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
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

// 获取客户详情
export const getCustomerById = async (id: number) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        where: { status: { not: 'cancelled' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
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
        },
      },
      receivables: {
        where: { status: { not: 'paid' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!customer) {
    throw new AppError(404, '客户不存在')
  }

  return customer
}

// 根据编码获取客户
export const getCustomerByCode = async (code: string) => {
  const customer = await prisma.customer.findUnique({
    where: { code },
  })

  if (!customer) {
    throw new AppError(404, '客户不存在')
  }

  return customer
}

// 创建客户
export const createCustomer = async (data: CreateCustomerDTO) => {
  // 检查编码是否已存在
  const existing = await prisma.customer.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new AppError(400, '客户编码已存在')
  }

  // 检查手机号是否已存在
  if (data.phone) {
    const phoneExists = await prisma.customer.findFirst({
      where: { phone: data.phone },
    })
    if (phoneExists) {
      throw new AppError(400, '手机号已存在')
    }
  }

  const customer = await prisma.customer.create({
    data: {
      code: data.code,
      name: data.name,
      phone: data.phone,
      address: data.address,
      creditLimit: data.creditLimit || 0,
    },
  })

  return customer
}

// 更新客户
export const updateCustomer = async (id: number, data: UpdateCustomerDTO) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
  })

  if (!customer) {
    throw new AppError(404, '客户不存在')
  }

  // 如果更新手机号，检查是否已存在
  if (data.phone && data.phone !== customer.phone) {
    const phoneExists = await prisma.customer.findFirst({
      where: {
        phone: data.phone,
        NOT: { id },
      },
    })
    if (phoneExists) {
      throw new AppError(400, '手机号已存在')
    }
  }

  const updated = await prisma.customer.update({
    where: { id },
    data,
  })

  return updated
}

// 获取客户购买历史
export const getCustomerHistory = async (customerId: number, query: { page?: number; pageSize?: number }) => {
  const { page = 1, pageSize = 20 } = query

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  })

  if (!customer) {
    throw new AppError(404, '客户不存在')
  }

  const [total, sales] = await Promise.all([
    prisma.sale.count({
      where: {
        customerId,
        status: { not: 'cancelled' },
      },
    }),
    prisma.sale.findMany({
      where: {
        customerId,
        status: { not: 'cancelled' },
      },
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
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    customer,
    sales,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// 获取客户欠款信息
export const getCustomerDebt = async (customerId: number) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      receivables: {
        where: { status: { not: 'paid' } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!customer) {
    throw new AppError(404, '客户不存在')
  }

  const totalDebt = customer.receivables.reduce((sum, r) => sum + r.amount - r.paidAmount, 0)

  return {
    customer,
    totalDebt,
    receivables: customer.receivables,
    availableCredit: customer.creditLimit - customer.balance,
  }
}

// 删除客户
export const deleteCustomer = async (id: number) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: { select: { id: true, orderNo: true } },
      receivables: { select: { id: true } },
      payments: { select: { id: true } },
    },
  })

  if (!customer) {
    throw new AppError(404, '客户不存在')
  }

  // 检查是否有销售订单
  if (customer.sales.length > 0) {
    throw new AppError(400, `该客户有 ${customer.sales.length} 笔销售订单，无法删除`)
  }

  // 检查是否有应收账款
  if (customer.receivables.length > 0) {
    throw new AppError(400, '该客户有应收账款记录，无法删除')
  }

  // 检查是否有收款记录
  if (customer.payments.length > 0) {
    throw new AppError(400, '该客户有收款记录，无法删除')
  }

  await prisma.customer.delete({
    where: { id },
  })

  return { success: true }
}
