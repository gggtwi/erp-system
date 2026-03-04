import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as saleService from '../sale.service'

describe('Sale Service', () => {
  let testCategory: any
  let testProduct: any
  let testSKU1: any
  let testSKU2: any
  let testCustomer: any
  let testUser: any
  let frozenCustomer: any

  beforeAll(async () => {
    // 创建测试分类
    testCategory = await prisma.category.create({
      data: { name: '测试分类-销售', sort: 0 },
    })

    // 创建测试商品
    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-SALE-001',
        name: '测试商品-销售',
        categoryId: testCategory.id,
        unit: '台',
        warranty: 12,
      },
    })

    // 创建测试 SKU
    testSKU1 = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-SALE-001',
        name: '测试SKU-销售1',
        price: 2999,
        costPrice: 2000,
      },
    })

    testSKU2 = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-SALE-002',
        name: '测试SKU-销售2',
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

    // 创建序列号
    await prisma.serialNumber.createMany({
      data: [
        { skuId: testSKU1.id, serialNo: 'SN-SALE-001', status: 'in_stock' },
        { skuId: testSKU1.id, serialNo: 'SN-SALE-002', status: 'in_stock' },
        { skuId: testSKU1.id, serialNo: 'SN-SALE-003', status: 'sold' },
        { skuId: testSKU2.id, serialNo: 'SN-SALE-004', status: 'in_stock' },
      ],
    })

    // 创建测试客户
    testCustomer = await prisma.customer.create({
      data: {
        code: 'CUST-SALE-001',
        name: '测试客户-销售',
        phone: '13900139001',
        creditLimit: 50000,
        balance: 0,
      },
    })

    // 创建冻结客户
    frozenCustomer = await prisma.customer.create({
      data: {
        code: 'CUST-FROZEN-001',
        name: '冻结客户',
        status: 'frozen',
      },
    })

    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        username: 'test-sale-user',
        password: 'hashed_password',
        name: '销售测试用户',
        role: 'sales',
      },
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.payment.deleteMany({
      where: { customerId: testCustomer.id },
    })
    await prisma.receivable.deleteMany({
      where: { customerId: testCustomer.id },
    })
    await prisma.saleItem.deleteMany({
      where: {
        sale: { customerId: testCustomer.id },
      },
    })
    await prisma.sale.deleteMany({
      where: { customerId: testCustomer.id },
    })
    await prisma.inventoryLog.deleteMany({
      where: {
        OR: [{ skuId: testSKU1.id }, { skuId: testSKU2.id }],
      },
    })
    await prisma.serialNumber.deleteMany({
      where: {
        OR: [{ skuId: testSKU1.id }, { skuId: testSKU2.id }],
      },
    })
    await prisma.inventory.deleteMany({
      where: {
        OR: [{ skuId: testSKU1.id }, { skuId: testSKU2.id }],
      },
    })
    await prisma.sKU.deleteMany({
      where: { productId: testProduct.id },
    })
    await prisma.product.delete({ where: { id: testProduct.id } })
    await prisma.category.delete({ where: { id: testCategory.id } })
    await prisma.customer.delete({
      where: { id: testCustomer.id },
    })
    await prisma.customer.delete({
      where: { id: frozenCustomer.id },
    })
    await prisma.user.delete({ where: { id: testUser.id } })
  })

  describe('createSale', () => {
    it('should create a sale order successfully', async () => {
      const result = await saleService.createSale(
        {
          customerId: testCustomer.id,
          items: [
            { skuId: testSKU1.id, quantity: 2, price: 2999 },
            { skuId: testSKU2.id, quantity: 1, price: 1999 },
          ],
          discountAmount: 100,
          paidAmount: 5000,
          remark: '测试订单',
        },
        testUser.id
      )

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('orderNo')
      expect(result.orderNo).toMatch(/^SO\d{12}$/)
      expect(result.status).toBe('confirmed')
      expect(result.totalAmount).toBe(7997) // 2999*2 + 1999*1
      expect(result.discountAmount).toBe(100)
      expect(result.paidAmount).toBe(5000)
      expect(result.debtAmount).toBe(2897) // 7997 - 100 - 5000
      expect(result.paymentStatus).toBe('partial')
      expect(result.items).toHaveLength(2)

      // 验证库存扣减
      const inv1 = await prisma.inventory.findUnique({
        where: { skuId: testSKU1.id },
      })
      expect(inv1?.quantity).toBe(98)

      const inv2 = await prisma.inventory.findUnique({
        where: { skuId: testSKU2.id },
      })
      expect(inv2?.quantity).toBe(49)

      // 验证应收账款
      const receivable = await prisma.receivable.findFirst({
        where: { saleId: result.id },
      })
      expect(receivable).toBeDefined()
      expect(receivable?.amount).toBe(2897)

      // 验证客户欠款
      const customer = await prisma.customer.findUnique({
        where: { id: testCustomer.id },
      })
      expect(customer?.balance).toBe(2897)
    })

    it('should create sale with serial numbers', async () => {
      const result = await saleService.createSale(
        {
          customerId: testCustomer.id,
          items: [
            {
              skuId: testSKU1.id,
              quantity: 2,
              price: 2999,
              serialNos: ['SN-SALE-001', 'SN-SALE-002'],
            },
          ],
          paidAmount: 5998,
        },
        testUser.id
      )

      expect(result.status).toBe('confirmed')

      // 验证序列号状态更新
      const sn1 = await prisma.serialNumber.findFirst({
        where: { serialNo: 'SN-SALE-001' },
      })
      expect(sn1?.status).toBe('sold')
      expect(sn1?.saleId).toBe(result.id)
      expect(sn1?.customerId).toBe(testCustomer.id)

      const sn2 = await prisma.serialNumber.findFirst({
        where: { serialNo: 'SN-SALE-002' },
      })
      expect(sn2?.status).toBe('sold')
    })

    it('should reject sale with frozen customer', async () => {
      await expect(
        saleService.createSale(
          {
            customerId: frozenCustomer.id,
            items: [{ skuId: testSKU1.id, quantity: 1, price: 2999 }],
          },
          testUser.id
        )
      ).rejects.toThrow('客户已被冻结')
    })

    it('should reject sale with insufficient stock', async () => {
      // 支付全款来绕过授信额度检查
      await expect(
        saleService.createSale(
          {
            customerId: testCustomer.id,
            items: [{ skuId: testSKU1.id, quantity: 10000, price: 2999 }],
            paidAmount: 29990000, // 全款支付
          },
          testUser.id
        )
      ).rejects.toThrow('库存不足')
    })

    it('should reject sale with invalid serial number', async () => {
      await expect(
        saleService.createSale(
          {
            customerId: testCustomer.id,
            items: [
              {
                skuId: testSKU1.id,
                quantity: 1,
                price: 2999,
                serialNos: ['SN-SALE-003'], // 已售出
              },
            ],
          },
          testUser.id
        )
      ).rejects.toThrow('已售出或不可用')
    })

    it('should reject sale with wrong serial number count', async () => {
      await expect(
        saleService.createSale(
          {
            customerId: testCustomer.id,
            items: [
              {
                skuId: testSKU1.id,
                quantity: 2,
                price: 2999,
                serialNos: ['SN-ONE'], // 数量不一致
              },
            ],
          },
          testUser.id
        )
      ).rejects.toThrow('序列号数量与购买数量不一致')
    })

    it('should reject sale exceeding credit limit', async () => {
      // 更新客户授信额度
      await prisma.customer.update({
        where: { id: testCustomer.id },
        data: { creditLimit: 3000, balance: 2897 },
      })

      await expect(
        saleService.createSale(
          {
            customerId: testCustomer.id,
            items: [{ skuId: testSKU1.id, quantity: 10, price: 2999 }],
          },
          testUser.id
        )
      ).rejects.toThrow('超出授信额度')

      // 恢复授信额度
      await prisma.customer.update({
        where: { id: testCustomer.id },
        data: { creditLimit: 50000 },
      })
    })

    it('should create fully paid sale', async () => {
      const result = await saleService.createSale(
        {
          customerId: testCustomer.id,
          items: [{ skuId: testSKU2.id, quantity: 1, price: 1999 }],
          paidAmount: 1999,
        },
        testUser.id
      )

      expect(result.paymentStatus).toBe('paid')
      expect(result.debtAmount).toBe(0)

      // 不应创建应收账款
      const receivable = await prisma.receivable.findFirst({
        where: { saleId: result.id },
      })
      expect(receivable).toBeNull()
    })
  })

  describe('createDraftSale', () => {
    it('should create draft sale without inventory deduction', async () => {
      const beforeInv = await prisma.inventory.findUnique({
        where: { skuId: testSKU1.id },
      })

      const result = await saleService.createDraftSale(
        {
          customerId: testCustomer.id,
          items: [{ skuId: testSKU1.id, quantity: 5, price: 2999 }],
          remark: '草稿订单',
        },
        testUser.id
      )

      expect(result.status).toBe('draft')

      // 库存不应变化
      const afterInv = await prisma.inventory.findUnique({
        where: { skuId: testSKU1.id },
      })
      expect(afterInv?.quantity).toBe(beforeInv?.quantity)
    })
  })

  describe('getSaleList', () => {
    it('should return sale list with pagination', async () => {
      const result = await saleService.getSaleList({})

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page', 1)
    })

    it('should filter by customer', async () => {
      const result = await saleService.getSaleList({
        customerId: testCustomer.id,
      })

      expect(result.list.every((s) => s.customerId === testCustomer.id)).toBe(
        true
      )
    })

    it('should filter by status', async () => {
      const result = await saleService.getSaleList({
        status: 'confirmed',
      })

      expect(result.list.every((s) => s.status === 'confirmed')).toBe(true)
    })

    it('should filter by date range', async () => {
      const today = new Date().toISOString().slice(0, 10)
      const result = await saleService.getSaleList({
        startDate: today,
        endDate: today,
      })

      expect(result).toHaveProperty('list')
    })
  })

  describe('getSaleById', () => {
    let testSale: any

    beforeAll(async () => {
      testSale = await saleService.createSale(
        {
          customerId: testCustomer.id,
          items: [{ skuId: testSKU2.id, quantity: 1, price: 1999 }],
          paidAmount: 1999,
        },
        testUser.id
      )
    })

    it('should return sale detail', async () => {
      const result = await saleService.getSaleById(testSale.id)

      expect(result.id).toBe(testSale.id)
      expect(result).toHaveProperty('customer')
      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('operator')
    })

    it('should throw error for non-existent sale', async () => {
      await expect(saleService.getSaleById(99999)).rejects.toThrow(
        '订单不存在'
      )
    })
  })

  describe('confirmSale', () => {
    let draftSale: any

    beforeEach(async () => {
      draftSale = await saleService.createDraftSale(
        {
          customerId: testCustomer.id,
          items: [{ skuId: testSKU1.id, quantity: 1, price: 2999 }],
          paidAmount: 2999,
        },
        testUser.id
      )
    })

    it('should confirm draft sale and deduct inventory', async () => {
      const beforeInv = await prisma.inventory.findUnique({
        where: { skuId: testSKU1.id },
      })

      const result = await saleService.confirmSale(draftSale.id, testUser.id)

      expect(result.status).toBe('confirmed')

      const afterInv = await prisma.inventory.findUnique({
        where: { skuId: testSKU1.id },
      })
      expect(afterInv?.quantity).toBe((beforeInv?.quantity || 0) - 1)
    })

    it('should reject confirming non-draft sale', async () => {
      const sale = await saleService.createSale(
        {
          customerId: testCustomer.id,
          items: [{ skuId: testSKU1.id, quantity: 1, price: 2999 }],
        },
        testUser.id
      )

      await expect(saleService.confirmSale(sale.id, testUser.id)).rejects.toThrow(
        '只能确认草稿订单'
      )
    })
  })

  describe('cancelSale', () => {
    let saleToCancel: any

    beforeEach(async () => {
      saleToCancel = await saleService.createSale(
        {
          customerId: testCustomer.id,
          items: [{ skuId: testSKU2.id, quantity: 1, price: 1999 }],
          debtAmount: 1999,
        },
        testUser.id
      )
    })

    it('should cancel sale and restore inventory', async () => {
      const beforeInv = await prisma.inventory.findUnique({
        where: { skuId: testSKU2.id },
      })

      await saleService.cancelSale(saleToCancel.id, testUser.id)

      const sale = await prisma.sale.findUnique({
        where: { id: saleToCancel.id },
      })
      expect(sale?.status).toBe('cancelled')

      const afterInv = await prisma.inventory.findUnique({
        where: { skuId: testSKU2.id },
      })
      expect(afterInv?.quantity).toBe((beforeInv?.quantity || 0) + 1)

      // 应收账款应被删除
      const receivable = await prisma.receivable.findFirst({
        where: { saleId: saleToCancel.id },
      })
      expect(receivable).toBeNull()
    })

    it('should reject cancelling completed sale', async () => {
      await prisma.sale.update({
        where: { id: saleToCancel.id },
        data: { status: 'completed' },
      })

      await expect(
        saleService.cancelSale(saleToCancel.id, testUser.id)
      ).rejects.toThrow('已完成的订单无法取消')
    })
  })

  describe('getPrintData', () => {
    let testSale: any

    beforeAll(async () => {
      // 创建新的可用序列号
      await prisma.serialNumber.create({
        data: { skuId: testSKU1.id, serialNo: 'SN-PRINT-001', status: 'in_stock' },
      })

      testSale = await saleService.createSale(
        {
          customerId: testCustomer.id,
          items: [
            {
              skuId: testSKU1.id,
              quantity: 1,
              price: 2999,
              serialNos: ['SN-PRINT-001'],
            },
          ],
          discountAmount: 100,
          paidAmount: 2000,
          remark: '打印测试订单',
        },
        testUser.id
      )
    })

    it('should return print data', async () => {
      const result = await saleService.getPrintData(testSale.id)

      expect(result).toHaveProperty('orderNo')
      expect(result).toHaveProperty('customer')
      expect(result.customer.name).toBe(testCustomer.name)
      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('totalAmount')
      expect(result).toHaveProperty('discountAmount')
      expect(result).toHaveProperty('paidAmount')
      expect(result).toHaveProperty('debtAmount')
      expect(result).toHaveProperty('finalAmount')
      expect(result.finalAmount).toBe(2899) // 2999 - 100
    })
  })
})
