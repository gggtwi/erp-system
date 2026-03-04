import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'

export interface SaleQuery {
  keyword?: string
  customerId?: number
  status?: string
  paymentStatus?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface SaleItemDTO {
  skuId: number
  quantity: number
  price: number
  serialNos?: string[]
  remark?: string
}

export interface CreateSaleDTO {
  customerId: number
  items: SaleItemDTO[]
  discountAmount?: number
  paidAmount?: number
  paymentMethod?: string
  remark?: string
}

export interface UpdateSaleDTO {
  customerId?: number
  items?: SaleItemDTO[]
  discountAmount?: number
  paidAmount?: number
  remark?: string
}

// 生成订单号
const generateOrderNo = async (prefix: string = 'SO'): Promise<string> => {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  
  // 查询今天的最大订单号
  const lastOrder = await prisma.sale.findFirst({
    where: {
      orderNo: { startsWith: `${prefix}${dateStr}` },
    },
    orderBy: { orderNo: 'desc' },
  })

  let seq = 1
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNo.slice(-4))
    seq = lastSeq + 1
  }

  return `${prefix}${dateStr}${seq.toString().padStart(4, '0')}`
}

// 获取订单列表
export const getSaleList = async (query: SaleQuery) => {
  const {
    keyword,
    customerId,
    status,
    paymentStatus,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = query

  const where: any = {}

  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
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

  if (paymentStatus) {
    where.paymentStatus = paymentStatus
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
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        customer: true,
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
            username: true,
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

// 获取订单详情
export const getSaleById = async (id: number) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
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
          username: true,
        },
      },
      receivable: {
        include: {
          payments: {
            include: {
              operator: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!sale) {
    throw new AppError(404, '订单不存在')
  }

  return sale
}

// 创建销售订单（核心业务）
export const createSale = async (data: CreateSaleDTO, operatorId: number) => {
  // 1. 校验客户
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  })

  if (!customer) {
    throw new AppError(400, '客户不存在')
  }

  if (customer.status === 'frozen') {
    throw new AppError(400, '客户已被冻结，无法开单')
  }

  // 2. 计算订单金额
  const itemsWithAmount = data.items.map((item) => ({
    ...item,
    amount: item.price * item.quantity,
  }))

  const totalAmount = itemsWithAmount.reduce((sum, item) => sum + item.amount, 0)
  const discountAmount = data.discountAmount || 0
  
  // 校验折扣金额
  if (discountAmount > totalAmount) {
    throw new AppError(400, `折扣金额不能超过订单总额 ${totalAmount.toFixed(2)}`)
  }
  
  const finalAmount = totalAmount - discountAmount
  const paidAmount = data.paidAmount || 0
  const debtAmount = Math.max(0, finalAmount - paidAmount)

  // 3. 校验授信额度（已取消）
  // if (debtAmount > 0) {
  //   const availableCredit = customer.creditLimit - customer.balance
  //   if (debtAmount > availableCredit) {
  //     throw new AppError(400, `超出授信额度，可用额度: ${availableCredit.toFixed(2)}`)
  //   }
  // }

  // 4. 校验库存和序列号
  for (const item of itemsWithAmount) {
    const sku = await prisma.sKU.findUnique({
      where: { id: item.skuId },
      include: {
        inventory: true,
        product: true,
      },
    })

    if (!sku) {
      throw new AppError(400, `SKU ${item.skuId} 不存在`)
    }

    if (!sku.inventory || sku.inventory.quantity < item.quantity) {
      throw new AppError(400, `商品 ${sku.product.name} - ${sku.name} 库存不足`)
    }

    // 如果有序列号，校验序列号
    if (item.serialNos && item.serialNos.length > 0) {
      if (item.serialNos.length !== item.quantity) {
        throw new AppError(400, `商品 ${sku.product.name} 序列号数量与购买数量不一致`)
      }

      const serials = await prisma.serialNumber.findMany({
        where: {
          skuId: item.skuId,
          serialNo: { in: item.serialNos },
        },
      })

      // 检查所有序列号是否存在且可用
      for (const sn of item.serialNos) {
        const found = serials.find((s) => s.serialNo === sn)
        if (!found) {
          throw new AppError(400, `序列号 ${sn} 不存在`)
        }
        if (found.status !== 'in_stock') {
          throw new AppError(400, `序列号 ${sn} 已售出或不可用`)
        }
      }
    }
  }

  // 5. 使用事务创建订单
  const sale = await prisma.$transaction(async (tx) => {
    // 生成订单号
    const orderNo = await generateOrderNo()

    // 计算支付状态
    const paymentStatus = paidAmount >= finalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'

    // 创建订单
    const newSale = await tx.sale.create({
      data: {
        orderNo,
        customerId: data.customerId,
        totalAmount,
        discountAmount,
        paidAmount,
        debtAmount,
        status: 'confirmed',
        paymentStatus,
        remark: data.remark,
        operatorId,
        items: {
          create: itemsWithAmount.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
            price: item.price,
            amount: item.amount,
            serialNo: item.serialNos?.join(','), // 用逗号分隔多个序列号
            remark: item.remark,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    // 扣减库存并记录流水
    for (const item of itemsWithAmount) {
      const inventory = await tx.inventory.findUnique({
        where: { skuId: item.skuId },
      })

      if (!inventory) {
        throw new AppError(500, '库存记录不存在')
      }

      const beforeQty = inventory.quantity
      const afterQty = beforeQty - item.quantity

      // 更新库存
      await tx.inventory.update({
        where: { skuId: item.skuId },
        data: {
          quantity: afterQty,
        },
      })

      // 记录库存流水
      await tx.inventoryLog.create({
        data: {
          skuId: item.skuId,
          type: 'out',
          quantity: -item.quantity,
          beforeQty,
          afterQty,
          refType: 'sale',
          refId: newSale.id,
          operatorId,
        },
      })

      // 更新序列号状态
      if (item.serialNos && item.serialNos.length > 0) {
        await tx.serialNumber.updateMany({
          where: {
            skuId: item.skuId,
            serialNo: { in: item.serialNos },
          },
          data: {
            status: 'sold',
            saleId: newSale.id,
            customerId: data.customerId,
            soldAt: new Date(),
          },
        })
      }
    }

    // 处理应收账款
    if (debtAmount > 0) {
      await tx.receivable.create({
        data: {
          customerId: data.customerId,
          saleId: newSale.id,
          amount: debtAmount,
          status: 'unpaid',
        },
      })

      // 更新客户欠款余额
      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          balance: { increment: debtAmount },
        },
      })
    }

    return newSale
  })

  // 返回完整的订单信息
  return getSaleById(sale.id)
}

// 创建草稿订单
export const createDraftSale = async (data: CreateSaleDTO, operatorId: number) => {
  // 校验客户
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  })

  if (!customer) {
    throw new AppError(400, '客户不存在')
  }

  // 计算订单金额
  const itemsWithAmount = data.items.map((item) => ({
    ...item,
    amount: item.price * item.quantity,
  }))

  const totalAmount = itemsWithAmount.reduce((sum, item) => sum + item.amount, 0)
  const discountAmount = data.discountAmount || 0
  
  // 校验折扣金额
  if (discountAmount > totalAmount) {
    throw new AppError(400, `折扣金额不能超过订单总额 ${totalAmount.toFixed(2)}`)
  }
  
  const finalAmount = totalAmount - discountAmount
  const paidAmount = data.paidAmount || 0
  const debtAmount = Math.max(0, finalAmount - paidAmount)

  const sale = await prisma.$transaction(async (tx) => {
    const orderNo = await generateOrderNo()
    const paymentStatus = paidAmount >= finalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'

    const newSale = await tx.sale.create({
      data: {
        orderNo,
        customerId: data.customerId,
        totalAmount,
        discountAmount,
        paidAmount,
        debtAmount,
        status: 'draft',
        paymentStatus,
        remark: data.remark,
        operatorId,
        items: {
          create: itemsWithAmount.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
            price: item.price,
            amount: item.amount,
            serialNo: item.serialNos?.join(','),
            remark: item.remark,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return newSale
  })

  return getSaleById(sale.id)
}

// 更新草稿订单
export const updateSale = async (id: number, data: UpdateSaleDTO, operatorId: number) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!sale) {
    throw new AppError(404, '订单不存在')
  }

  if (sale.status !== 'draft') {
    throw new AppError(400, '只能修改草稿订单')
  }

  // 重新计算金额
  let itemsWithAmount = sale.items.map((item) => ({
    skuId: item.skuId,
    quantity: item.quantity,
    price: item.price,
    amount: item.amount,
  }))

  if (data.items) {
    itemsWithAmount = data.items.map((item) => ({
      ...item,
      amount: item.price * item.quantity,
    }))
  }

  const totalAmount = itemsWithAmount.reduce((sum, item) => sum + item.amount, 0)
  const discountAmount = data.discountAmount ?? sale.discountAmount
  const finalAmount = totalAmount - discountAmount
  const paidAmount = data.paidAmount ?? sale.paidAmount
  const debtAmount = Math.max(0, finalAmount - paidAmount)

  const updated = await prisma.$transaction(async (tx) => {
    // 更新订单
    const updatedSale = await tx.sale.update({
      where: { id },
      data: {
        customerId: data.customerId,
        totalAmount,
        discountAmount,
        paidAmount,
        debtAmount,
        paymentStatus: paidAmount >= finalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      },
    })

    // 如果有新的明细，删除旧的，创建新的
    if (data.items) {
      await tx.saleItem.deleteMany({
        where: { saleId: id },
      })

      await tx.saleItem.createMany({
        data: itemsWithAmount.map((item) => ({
          saleId: id,
          skuId: item.skuId,
          quantity: item.quantity,
          price: item.price,
          amount: item.amount,
        })),
      })
    }

    return updatedSale
  })

  return getSaleById(id)
}

// 确认订单
export const confirmSale = async (id: number, operatorId: number) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      customer: true,
    },
  })

  if (!sale) {
    throw new AppError(404, '订单不存在')
  }

  if (sale.status !== 'draft') {
    throw new AppError(400, '只能确认草稿订单')
  }

  // 校验客户状态
  if (sale.customer.status === 'frozen') {
    throw new AppError(400, '客户已被冻结，无法确认订单')
  }

  // 校验授信额度
  if (sale.debtAmount > 0) {
    const availableCredit = sale.customer.creditLimit - sale.customer.balance
    if (sale.debtAmount > availableCredit) {
      throw new AppError(400, `超出授信额度，可用额度: ${availableCredit.toFixed(2)}`)
    }
  }

  // 校验库存
  for (const item of sale.items) {
    const inventory = await prisma.inventory.findUnique({
      where: { skuId: item.skuId },
    })

    if (!inventory || inventory.quantity < item.quantity) {
      throw new AppError(400, '库存不足，无法确认订单')
    }
  }

  // 使用事务确认订单
  await prisma.$transaction(async (tx) => {
    // 更新订单状态
    await tx.sale.update({
      where: { id },
      data: { status: 'confirmed' },
    })

    // 扣减库存
    for (const item of sale.items) {
      const inventory = await tx.inventory.findUnique({
        where: { skuId: item.skuId },
      })

      if (!inventory) continue

      const beforeQty = inventory.quantity
      const afterQty = beforeQty - item.quantity

      await tx.inventory.update({
        where: { skuId: item.skuId },
        data: { quantity: afterQty },
      })

      await tx.inventoryLog.create({
        data: {
          skuId: item.skuId,
          type: 'out',
          quantity: -item.quantity,
          beforeQty,
          afterQty,
          refType: 'sale',
          refId: sale.id,
          operatorId,
        },
      })
    }

    // 创建应收账款
    if (sale.debtAmount > 0) {
      await tx.receivable.create({
        data: {
          customerId: sale.customerId,
          saleId: sale.id,
          amount: sale.debtAmount,
          status: 'unpaid',
        },
      })

      await tx.customer.update({
        where: { id: sale.customerId },
        data: {
          balance: { increment: sale.debtAmount },
        },
      })
    }
  })

  return getSaleById(id)
}

// 取消订单
export const cancelSale = async (id: number, operatorId: number) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      receivable: true,
    },
  })

  if (!sale) {
    throw new AppError(404, '订单不存在')
  }

  if (sale.status === 'cancelled') {
    throw new AppError(400, '订单已取消')
  }

  if (sale.status === 'completed') {
    throw new AppError(400, '已完成的订单无法取消')
  }

  // 使用事务取消订单
  await prisma.$transaction(async (tx) => {
    // 如果已确认，需要恢复库存
    if (sale.status === 'confirmed') {
      for (const item of sale.items) {
        const inventory = await tx.inventory.findUnique({
          where: { skuId: item.skuId },
        })

        if (inventory) {
          const beforeQty = inventory.quantity
          const afterQty = beforeQty + item.quantity

          await tx.inventory.update({
            where: { skuId: item.skuId },
            data: { quantity: afterQty },
          })

          await tx.inventoryLog.create({
            data: {
              skuId: item.skuId,
              type: 'in',
              quantity: item.quantity,
              beforeQty,
              afterQty,
              refType: 'sale_cancel',
              refId: sale.id,
              remark: '订单取消退回库存',
              operatorId,
            },
          })
        }
      }

      // 删除应收账款并恢复客户欠款
      if (sale.receivable) {
        await tx.payment.deleteMany({
          where: { receivableId: sale.receivable.id },
        })

        await tx.receivable.delete({
          where: { id: sale.receivable.id },
        })

        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            balance: { decrement: sale.debtAmount },
          },
        })
      }
    }

    // 更新订单状态
    await tx.sale.update({
      where: { id },
      data: { status: 'cancelled' },
    })
  })

  return { success: true }
}

// 获取打印数据
export const getPrintData = async (id: number) => {
  const sale = await getSaleById(id)

  return {
    orderNo: sale.orderNo,
    createdAt: sale.createdAt,
    customer: {
      name: sale.customer.name,
      phone: sale.customer.phone,
      address: sale.customer.address,
    },
    items: sale.items.map((item) => ({
      productName: item.sku.product.name,
      skuName: item.sku.name,
      quantity: item.quantity,
      price: item.price,
      amount: item.amount,
      serialNo: item.serialNo,
    })),
    totalAmount: sale.totalAmount,
    discountAmount: sale.discountAmount,
    paidAmount: sale.paidAmount,
    debtAmount: sale.debtAmount,
    finalAmount: sale.totalAmount - sale.discountAmount,
    operator: sale.operator.name,
    remark: sale.remark,
  }
}

// 删除订单
export const deleteSale = async (id: number, operatorId: number, operatorRole: string) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      receivable: {
        include: { payments: true }
      },
    },
  })

  if (!sale) {
    throw new AppError(404, '订单不存在')
  }

  // 超级管理员可以删除任何订单，其他用户只能删除已取消的订单
  const isSuperAdmin = operatorRole === 'super_admin'
  
  if (!isSuperAdmin && sale.status !== 'cancelled') {
    throw new AppError(400, '只能删除已取消的订单')
  }

  // 使用事务删除订单及相关数据
  await prisma.$transaction(async (tx) => {
    // 如果删除已确认/已完成的订单（超级管理员操作），需要恢复库存
    if (sale.status === 'confirmed' || sale.status === 'completed') {
      for (const item of sale.items) {
        const inventory = await tx.inventory.findUnique({
          where: { skuId: item.skuId },
        })

        if (inventory) {
          const beforeQty = inventory.quantity
          const afterQty = beforeQty + item.quantity

          await tx.inventory.update({
            where: { skuId: item.skuId },
            data: { quantity: afterQty },
          })

          await tx.inventoryLog.create({
            data: {
              skuId: item.skuId,
              type: 'in',
              quantity: item.quantity,
              beforeQty,
              afterQty,
              refType: 'sale_delete',
              refId: sale.id,
              remark: '订单删除退回库存',
              operatorId,
            },
          })
        }
      }

      // 恢复客户欠款
      if (sale.receivable) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            balance: { decrement: sale.debtAmount },
          },
        })
      }
    }

    // 删除收款记录
    if (sale.receivable && sale.receivable.payments.length > 0) {
      await tx.payment.deleteMany({
        where: { receivableId: sale.receivable.id },
      })
    }

    // 删除应收账款
    if (sale.receivable) {
      await tx.receivable.delete({
        where: { id: sale.receivable.id },
      })
    }

    // 删除订单项
    await tx.saleItem.deleteMany({
      where: { saleId: id },
    })

    // 删除订单
    await tx.sale.delete({
      where: { id },
    })
  })

  return { success: true }
}
