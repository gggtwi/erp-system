import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as financeService from '../finance.service'

describe('Finance Service', () => {
  let testCategory: any
  let testProduct: any
  let testSKU1: any
  let testSKU2: any
  let testCustomer1: any
  let testCustomer2: any
  let testUser: any
  let testSale1: any
  let testSale2: any
  let testReceivable1: any
  let testReceivable2: any

  beforeAll(async () => {
    // 创建测试分类
    testCategory = await prisma.category.create({
      data: { name: '测试分类-财务', sort: 0 },
    })

    // 创建测试商品
    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-FIN-001',
        name: '测试商品-财务',
        categoryId: testCategory.id,
        unit: '台',
        warranty: 12,
      },
    })

    // 创建测试 SKU
    testSKU1 = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-FIN-001',
        name: '测试SKU-财务1',
        price: 2999,
        costPrice: 2000,
      },
    })

    testSKU2 = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-FIN-002',
        name: '测试SKU-财务2',
        price: 1999,
        costPrice: 1200,
      },
    })

    // 初始化库存
    await prisma.inventory.createMany({
      data: [
        { skuId: testSKU1.id, quantity: 100 },
        { skuId: testSKU2.id, quantity: 50 },
      ],
    })

    // 创建测试客户
    testCustomer1 = await prisma.customer.create({
      data: {
        code: 'CUST-FIN-001',
        name: '测试客户-财务1',
        phone: '13900139001',
        creditLimit: 50000,
        balance: 0,
      },
    })

    testCustomer2 = await prisma.customer.create({
      data: {
        code: 'CUST-FIN-002',
        name: '测试客户-财务2',
        phone: '13900139002',
        creditLimit: 30000,
        balance: 0,
      },
    })

    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        username: 'test-finance-user',
        password: 'hashed_password',
        name: '财务测试用户',
        role: 'finance',
      },
    })

    // 创建测试销售订单
    testSale1 = await prisma.sale.create({
      data: {
        orderNo: 'SO-FIN-001',
        customerId: testCustomer1.id,
        totalAmount: 5998,
        discountAmount: 0,
        paidAmount: 0,
        debtAmount: 5998,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        operatorId: testUser.id,
        items: {
          create: [
            {
              skuId: testSKU1.id,
              quantity: 2,
              price: 2999,
              amount: 5998,
            },
          ],
        },
      },
    })

    testSale2 = await prisma.sale.create({
      data: {
        orderNo: 'SO-FIN-002',
        customerId: testCustomer2.id,
        totalAmount: 1999,
        discountAmount: 0,
        paidAmount: 500,
        debtAmount: 1499,
        status: 'confirmed',
        paymentStatus: 'partial',
        operatorId: testUser.id,
        items: {
          create: [
            {
              skuId: testSKU2.id,
              quantity: 1,
              price: 1999,
              amount: 1999,
            },
          ],
        },
      },
    })

    // 创建测试应收账款
    testReceivable1 = await prisma.receivable.create({
      data: {
        customerId: testCustomer1.id,
        saleId: testSale1.id,
        amount: 5998,
        paidAmount: 0,
        status: 'unpaid',
      },
    })

    testReceivable2 = await prisma.receivable.create({
      data: {
        customerId: testCustomer2.id,
        saleId: testSale2.id,
        amount: 1499,
        paidAmount: 500,
        status: 'partial',
      },
    })

    // 更新客户欠款余额
    await prisma.customer.update({
      where: { id: testCustomer1.id },
      data: { balance: 5998 },
    })

    await prisma.customer.update({
      where: { id: testCustomer2.id },
      data: { balance: 1499 },
    })
  })

  afterAll(async () => {
    // 清理测试数据（按外键依赖顺序删除）
    await prisma.payment.deleteMany({})
    await prisma.receivable.deleteMany({})
    await prisma.saleItem.deleteMany({})
    await prisma.sale.deleteMany({})
    await prisma.inventoryLog.deleteMany({})
    await prisma.serialNumber.deleteMany({})
    await prisma.inventory.deleteMany({})
    await prisma.sKU.deleteMany({})
    await prisma.product.deleteMany({})
    await prisma.category.deleteMany({})
    await prisma.customer.deleteMany({})
    await prisma.user.deleteMany({})
  })

  // ==================== 应收账款测试 ====================

  describe('getReceivableList', () => {
    it('should return receivable list', async () => {
      const result = await financeService.getReceivableList({})

      expect(result.list.length).toBeGreaterThanOrEqual(2)
      expect(result.total).toBeGreaterThanOrEqual(2)
    })

    it('should filter by customer id', async () => {
      const result = await financeService.getReceivableList({
        customerId: testCustomer1.id,
      })

      expect(result.list.every((r) => r.customerId === testCustomer1.id)).toBe(true)
    })

    it('should filter by status', async () => {
      const result = await financeService.getReceivableList({
        status: 'unpaid',
      })

      expect(result.list.every((r) => r.status === 'unpaid')).toBe(true)
    })

    it('should filter by keyword', async () => {
      const result = await financeService.getReceivableList({
        keyword: 'SO-FIN-001',
      })

      expect(result.list.length).toBe(1)
      expect(result.list[0].sale.orderNo).toBe('SO-FIN-001')
    })

    it('should calculate remaining amount', async () => {
      const result = await financeService.getReceivableList({
        customerId: testCustomer2.id,
      })

      const receivable = result.list.find((r) => r.id === testReceivable2.id)
      expect(receivable).toBeDefined()
      expect(receivable!.remainingAmount).toBe(999) // 1499 - 500
    })

    it('should paginate correctly', async () => {
      const result = await financeService.getReceivableList({
        page: 1,
        pageSize: 1,
      })

      expect(result.list.length).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(1)
    })
  })

  describe('getReceivableById', () => {
    it('should return receivable detail', async () => {
      const receivable = await financeService.getReceivableById(testReceivable1.id)

      expect(receivable.id).toBe(testReceivable1.id)
      expect(receivable.amount).toBe(5998)
      expect(receivable.customer.name).toBe('测试客户-财务1')
    })

    it('should throw error for non-existent receivable', async () => {
      await expect(financeService.getReceivableById(99999)).rejects.toThrow('应收账款不存在')
    })

    it('should include sale items', async () => {
      const receivable = await financeService.getReceivableById(testReceivable1.id)

      expect(receivable.sale.items.length).toBe(1)
      expect(receivable.sale.items[0].sku.name).toBe('测试SKU-财务1')
    })
  })

  describe('getCustomerDebt', () => {
    it('should return customer debt details', async () => {
      const debt = await financeService.getCustomerDebt(testCustomer1.id)

      expect(debt.customer.name).toBe('测试客户-财务1')
      expect(debt.summary.totalReceivable).toBe(5998)
      expect(debt.summary.totalRemaining).toBe(5998)
    })

    it('should throw error for non-existent customer', async () => {
      await expect(financeService.getCustomerDebt(99999)).rejects.toThrow('客户不存在')
    })

    it('should calculate aging buckets', async () => {
      const debt = await financeService.getCustomerDebt(testCustomer1.id)

      expect(debt.aging['0-30'].count).toBeGreaterThanOrEqual(1)
      expect(debt.aging['0-30'].amount).toBeGreaterThan(0)
    })

    it('should return receivables list', async () => {
      const debt = await financeService.getCustomerDebt(testCustomer1.id)

      expect(debt.receivables.length).toBeGreaterThanOrEqual(1)
      expect(debt.receivables[0].remainingAmount).toBe(5998)
    })

    it('should calculate available credit', async () => {
      const debt = await financeService.getCustomerDebt(testCustomer1.id)

      expect(debt.customer.creditLimit).toBe(50000)
      expect(debt.customer.balance).toBe(5998)
      expect(debt.customer.availableCredit).toBe(44002)
    })
  })

  describe('getReceivableStats', () => {
    it('should return receivable statistics', async () => {
      const stats = await financeService.getReceivableStats()

      expect(stats.totalAmount).toBeGreaterThan(0)
      expect(stats.totalRemaining).toBeGreaterThan(0)
    })

    it('should count by status', async () => {
      const stats = await financeService.getReceivableStats()

      expect(stats.byStatus.unpaid.count).toBeGreaterThanOrEqual(1)
      expect(stats.byStatus.partial.count).toBeGreaterThanOrEqual(1)
    })
  })

  // ==================== 收款测试 ====================

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const payment = await financeService.createPayment(
        {
          receivableId: testReceivable1.id,
          amount: 1000,
          method: 'wechat',
          remark: '微信收款',
        },
        testUser.id
      )

      expect(payment.amount).toBe(1000)
      expect(payment.method).toBe('wechat')
      expect(payment.customer.id).toBe(testCustomer1.id)
    })

    it('should update receivable status to partial', async () => {
      // 先收款部分金额
      await financeService.createPayment(
        {
          receivableId: testReceivable2.id,
          amount: 400,
          method: 'cash',
        },
        testUser.id
      )

      const receivable = await prisma.receivable.findUnique({
        where: { id: testReceivable2.id },
      })

      expect(receivable!.paidAmount).toBe(900) // 500 + 400
      expect(receivable!.status).toBe('partial')
    })

    it('should update receivable status to paid when fully paid', async () => {
      // 结清剩余金额
      await financeService.createPayment(
        {
          receivableId: testReceivable2.id,
          amount: 599, // 1499 - 900 = 599
          method: 'alipay',
        },
        testUser.id
      )

      const receivable = await prisma.receivable.findUnique({
        where: { id: testReceivable2.id },
      })

      expect(receivable!.paidAmount).toBe(1499)
      expect(receivable!.status).toBe('paid')
    })

    it('should update customer balance', async () => {
      // 获取最新的客户余额
      const customer = await prisma.customer.findUnique({
        where: { id: testCustomer1.id },
      })

      // 5998 - 1000 = 4998
      expect(customer!.balance).toBe(4998)
    })

    it('should throw error for non-existent receivable', async () => {
      await expect(
        financeService.createPayment(
          {
            receivableId: 99999,
            amount: 100,
            method: 'cash',
          },
          testUser.id
        )
      ).rejects.toThrow('应收账款不存在')
    })

    it('should throw error for already paid receivable', async () => {
      // testReceivable2 已经结清
      await expect(
        financeService.createPayment(
          {
            receivableId: testReceivable2.id,
            amount: 100,
            method: 'cash',
          },
          testUser.id
        )
      ).rejects.toThrow('该应收账款已结清')
    })

    it('should throw error for zero amount', async () => {
      await expect(
        financeService.createPayment(
          {
            receivableId: testReceivable1.id,
            amount: 0,
            method: 'cash',
          },
          testUser.id
        )
      ).rejects.toThrow('收款金额必须大于0')
    })

    it('should throw error for amount exceeding remaining', async () => {
      // testReceivable1 剩余 4998
      await expect(
        financeService.createPayment(
          {
            receivableId: testReceivable1.id,
            amount: 10000,
            method: 'cash',
          },
          testUser.id
        )
      ).rejects.toThrow('收款金额超出剩余金额')
    })

    it('should update sale payment status', async () => {
      // 创建一个完全结清的收款
      const receivable = await prisma.receivable.findUnique({
        where: { id: testReceivable1.id },
      })

      // 结清剩余金额
      await financeService.createPayment(
        {
          receivableId: testReceivable1.id,
          amount: receivable!.amount - receivable!.paidAmount,
          method: 'bank',
        },
        testUser.id
      )

      const sale = await prisma.sale.findUnique({
        where: { id: testSale1.id },
      })

      expect(sale!.paymentStatus).toBe('paid')
    })
  })

  describe('getPaymentList', () => {
    beforeAll(async () => {
      // 创建一些额外的收款记录用于测试
      const receivable = await prisma.receivable.findFirst({
        where: { status: 'unpaid' },
      })

      if (receivable) {
        await financeService.createPayment(
          {
            receivableId: receivable.id,
            amount: 500,
            method: 'cash',
          },
          testUser.id
        )
      }
    })

    it('should return payment list', async () => {
      const result = await financeService.getPaymentList({})

      expect(result.list.length).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(1)
    })

    it('should filter by customer id', async () => {
      const result = await financeService.getPaymentList({
        customerId: testCustomer1.id,
      })

      expect(result.list.every((p) => p.customerId === testCustomer1.id)).toBe(true)
    })

    it('should filter by method', async () => {
      const result = await financeService.getPaymentList({
        method: 'wechat',
      })

      expect(result.list.every((p) => p.method === 'wechat')).toBe(true)
    })

    it('should filter by keyword', async () => {
      const result = await financeService.getPaymentList({
        keyword: 'SO-FIN',
      })

      expect(result.list.length).toBeGreaterThanOrEqual(1)
    })

    it('should include customer info', async () => {
      const result = await financeService.getPaymentList({})

      expect(result.list[0].customer.name).toBeDefined()
    })

    it('should include receivable and sale info', async () => {
      const result = await financeService.getPaymentList({})

      expect(result.list[0].receivable).toBeDefined()
      expect(result.list[0].receivable.sale.orderNo).toBeDefined()
    })
  })

  describe('getPaymentById', () => {
    let testPayment: any

    beforeAll(async () => {
      testPayment = await prisma.payment.findFirst({
        where: { customerId: testCustomer1.id },
      })
    })

    it('should return payment detail', async () => {
      const payment = await financeService.getPaymentById(testPayment.id)

      expect(payment.id).toBe(testPayment.id)
      expect(payment.customer.name).toBe('测试客户-财务1')
    })

    it('should throw error for non-existent payment', async () => {
      await expect(financeService.getPaymentById(99999)).rejects.toThrow('收款记录不存在')
    })

    it('should include operator info', async () => {
      const payment = await financeService.getPaymentById(testPayment.id)

      expect(payment.operator.name).toBe('财务测试用户')
    })
  })

  describe('getPaymentStats', () => {
    it('should return payment statistics', async () => {
      const stats = await financeService.getPaymentStats()

      expect(stats.totalAmount).toBeGreaterThan(0)
      expect(stats.totalCount).toBeGreaterThan(0)
    })

    it('should group by method', async () => {
      const stats = await financeService.getPaymentStats()

      expect(stats.byMethod).toBeDefined()
      expect(typeof stats.byMethod.cash.amount).toBe('number')
      expect(typeof stats.byMethod.wechat.amount).toBe('number')
    })

    it('should return daily stats for last 7 days', async () => {
      const stats = await financeService.getPaymentStats()

      expect(stats.dailyStats.length).toBe(7)
      expect(stats.dailyStats[0].date).toBeDefined()
    })

    it('should filter by date range', async () => {
      const today = new Date().toISOString().slice(0, 10)
      const stats = await financeService.getPaymentStats(today, today)

      expect(stats).toBeDefined()
    })
  })
})
