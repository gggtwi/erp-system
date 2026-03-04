import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as reportService from '../report.service'
import * as saleService from '../sale.service'

describe('Report Service', () => {
  let testCategory: any
  let testProduct: any
  let testSKU1: any
  let testSKU2: any
  let testCustomer1: any
  let testCustomer2: any
  let testUser: any
  let testSale1: any
  let testSale2: any

  beforeAll(async () => {
    // 创建测试分类
    testCategory = await prisma.category.create({
      data: { name: '测试分类-报表', sort: 0 },
    })

    // 创建测试商品
    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-REPORT-001',
        name: '测试商品-报表',
        categoryId: testCategory.id,
        unit: '台',
        warranty: 12,
      },
    })

    // 创建测试 SKU
    testSKU1 = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-REPORT-001',
        name: '测试SKU-报表1',
        price: 2999,
        costPrice: 2000,
      },
    })

    testSKU2 = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-REPORT-002',
        name: '测试SKU-报表2',
        price: 1999,
        costPrice: 1200,
      },
    })

    // 初始化库存
    await prisma.inventory.createMany({
      data: [
        { skuId: testSKU1.id, quantity: 100 },
        { skuId: testSKU2.id, quantity: 5 }, // 低库存
      ],
    })

    // 创建测试客户
    testCustomer1 = await prisma.customer.create({
      data: {
        code: 'CUST-REPORT-001',
        name: '测试客户-报表1',
        phone: '13900139001',
        creditLimit: 100000,
        balance: 0,
      },
    })

    testCustomer2 = await prisma.customer.create({
      data: {
        code: 'CUST-REPORT-002',
        name: '测试客户-报表2',
        phone: '13900139002',
        creditLimit: 100000,
        balance: 0,
      },
    })

    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        username: 'test-report-user',
        password: 'hashed_password',
        name: '报表测试用户',
        role: 'admin',
      },
    })

    // 创建测试销售订单
    testSale1 = await saleService.createSale(
      {
        customerId: testCustomer1.id,
        items: [
          { skuId: testSKU1.id, quantity: 2, price: 2999 },
          { skuId: testSKU2.id, quantity: 1, price: 1999 },
        ],
        discountAmount: 100,
        paidAmount: 5000,
        remark: '测试订单1',
      },
      testUser.id
    )

    testSale2 = await saleService.createSale(
      {
        customerId: testCustomer2.id,
        items: [
          { skuId: testSKU1.id, quantity: 1, price: 2999 },
        ],
        paidAmount: 2999,
        remark: '测试订单2',
      },
      testUser.id
    )
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.payment.deleteMany({
      where: {
        OR: [{ customerId: testCustomer1.id }, { customerId: testCustomer2.id }],
      },
    })
    await prisma.receivable.deleteMany({
      where: {
        OR: [{ customerId: testCustomer1.id }, { customerId: testCustomer2.id }],
      },
    })
    await prisma.saleItem.deleteMany({
      where: {
        OR: [{ saleId: testSale1.id }, { saleId: testSale2.id }],
      },
    })
    await prisma.sale.deleteMany({
      where: {
        OR: [{ id: testSale1.id }, { id: testSale2.id }],
      },
    })
    await prisma.inventoryLog.deleteMany({
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
      where: { id: testCustomer1.id },
    })
    await prisma.customer.delete({
      where: { id: testCustomer2.id },
    })
    await prisma.user.delete({ where: { id: testUser.id } })
  })

  // ==================== 销售报表测试 ====================

  describe('getSalesSummary', () => {
    it('should return sales summary grouped by day', async () => {
      const result = await reportService.getSalesSummary({ groupBy: 'day' })

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('groupBy', 'day')
      expect(result.summary.orderCount).toBeGreaterThanOrEqual(2)
      expect(result.summary.totalAmount).toBeGreaterThan(0)
    })

    it('should return sales summary grouped by week', async () => {
      const result = await reportService.getSalesSummary({ groupBy: 'week' })

      expect(result.groupBy).toBe('week')
      expect(result.list.length).toBeGreaterThan(0)
    })

    it('should return sales summary grouped by month', async () => {
      const result = await reportService.getSalesSummary({ groupBy: 'month' })

      expect(result.groupBy).toBe('month')
      expect(result.list.length).toBeGreaterThan(0)
    })

    it('should filter by date range', async () => {
      const today = new Date().toISOString().slice(0, 10)
      const result = await reportService.getSalesSummary({
        startDate: today,
        endDate: today,
      })

      // 验证日期范围正确设置
      expect(result.dateRange.start).toBeDefined()
      expect(result.dateRange.end).toBeDefined()
    })

    it('should calculate correct summary totals', async () => {
      const result = await reportService.getSalesSummary({})

      // 验证汇总数据
      const listTotal = result.list.reduce((sum, item) => sum + item.totalAmount, 0)
      expect(result.summary.totalAmount).toBe(listTotal)

      const listOrderCount = result.list.reduce((sum, item) => sum + item.orderCount, 0)
      expect(result.summary.orderCount).toBe(listOrderCount)
    })
  })

  describe('getSalesDetail', () => {
    it('should return sales detail with pagination', async () => {
      const result = await reportService.getSalesDetail({})

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page', 1)
      expect(result).toHaveProperty('summary')
      expect(result.list.length).toBeGreaterThan(0)
    })

    it('should calculate profit for each item', async () => {
      const result = await reportService.getSalesDetail({ pageSize: 10 })

      const firstItem = result.list[0]
      expect(firstItem).toHaveProperty('costPrice')
      expect(firstItem).toHaveProperty('costAmount')
      expect(firstItem).toHaveProperty('profit')
      expect(firstItem.profit).toBe(firstItem.amount - firstItem.costAmount)
    })

    it('should filter by customer', async () => {
      const result = await reportService.getSalesDetail({
        customerId: testCustomer1.id,
      })

      // 验证所有返回的明细都属于指定客户
      expect(result.list.every((item) => item.customer.id === testCustomer1.id)).toBe(true)
    })

    it('should filter by product', async () => {
      const result = await reportService.getSalesDetail({
        productId: testProduct.id,
      })

      expect(result.list.every((item) => item.product.id === testProduct.id)).toBe(true)
    })

    it('should return correct summary totals', async () => {
      const result = await reportService.getSalesDetail({})

      const listTotalAmount = result.list.reduce((sum, item) => sum + item.amount, 0)
      expect(result.summary.totalAmount).toBe(listTotalAmount)

      const listTotalQuantity = result.list.reduce((sum, item) => sum + item.quantity, 0)
      expect(result.summary.totalQuantity).toBe(listTotalQuantity)
    })
  })

  describe('getSalesRanking', () => {
    it('should return product ranking', async () => {
      const result = await reportService.getSalesRanking({ type: 'product' })

      expect(result.type).toBe('product')
      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('dateRange')

      if (result.list.length > 0) {
        const firstItem = result.list[0]
        expect(firstItem).toHaveProperty('rank', 1)
        expect(firstItem).toHaveProperty('skuId')
        expect(firstItem).toHaveProperty('totalQuantity')
        expect(firstItem).toHaveProperty('totalAmount')
      }
    })

    it('should return customer ranking', async () => {
      const result = await reportService.getSalesRanking({ type: 'customer' })

      expect(result.type).toBe('customer')
      expect(result).toHaveProperty('list')

      if (result.list.length > 0) {
        const firstItem = result.list[0]
        expect(firstItem).toHaveProperty('rank', 1)
        expect(firstItem).toHaveProperty('customerId')
        expect(firstItem).toHaveProperty('totalAmount')
        expect(firstItem).toHaveProperty('orderCount')
      }
    })

    it('should limit results', async () => {
      const result = await reportService.getSalesRanking({ type: 'product', limit: 3 })

      expect(result.list.length).toBeLessThanOrEqual(3)
    })

    it('should sort by total amount descending', async () => {
      const result = await reportService.getSalesRanking({ type: 'product', limit: 10 })

      for (let i = 1; i < result.list.length; i++) {
        expect(result.list[i - 1].totalAmount).toBeGreaterThanOrEqual(result.list[i].totalAmount)
      }
    })
  })

  // ==================== 库存报表测试 ====================

  describe('getInventorySummary', () => {
    it('should return inventory summary', async () => {
      const result = await reportService.getInventorySummary({})

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('byCategory')
      expect(result.summary).toHaveProperty('totalSkus')
      expect(result.summary).toHaveProperty('totalQuantity')
      expect(result.summary).toHaveProperty('totalCost')
      expect(result.summary).toHaveProperty('totalValue')
      expect(result.summary).toHaveProperty('outOfStock')
      expect(result.summary).toHaveProperty('lowStock')
      expect(result.summary).toHaveProperty('normalStock')
    })

    it('should calculate correct inventory values', async () => {
      const result = await reportService.getInventorySummary({})

      // 验证成本和价值计算
      const totalCost = result.byCategory.reduce((sum, cat) => sum + cat.totalCost, 0)
      expect(result.summary.totalCost).toBe(totalCost)

      const totalValue = result.byCategory.reduce((sum, cat) => sum + cat.totalValue, 0)
      expect(result.summary.totalValue).toBe(totalValue)
    })

    it('should filter by category', async () => {
      const result = await reportService.getInventorySummary({
        categoryId: testCategory.id,
      })

      expect(result.byCategory.every((cat) => cat.categoryId === testCategory.id)).toBe(true)
    })

    it('should identify low stock items', async () => {
      const result = await reportService.getInventorySummary({})

      // testSKU2 库存为 5（测试前）或更少（销售后），应该被标记为低库存
      expect(result.summary.lowStock + result.summary.outOfStock).toBeGreaterThan(0)
    })
  })

  describe('getInventoryWarning', () => {
    it('should return inventory warning list', async () => {
      const result = await reportService.getInventoryWarning({ threshold: 10 })

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('threshold', 10)

      // 验证所有返回的库存都低于阈值
      expect(result.list.every((item) => item.quantity <= 10)).toBe(true)
    })

    it('should calculate shortage correctly', async () => {
      const result = await reportService.getInventoryWarning({ threshold: 10 })

      for (const item of result.list) {
        expect(item.shortage).toBe(Math.max(0, 10 - item.quantity))
      }
    })

    it('should return summary statistics', async () => {
      const result = await reportService.getInventoryWarning({ threshold: 10 })

      expect(result.summary.totalItems).toBe(result.list.length)
      expect(result.summary.outOfStock).toBe(result.list.filter((item) => item.quantity === 0).length)
      expect(result.summary.lowStock).toBe(result.list.filter((item) => item.quantity > 0).length)
    })

    it('should use custom threshold', async () => {
      const result = await reportService.getInventoryWarning({ threshold: 50 })

      expect(result.threshold).toBe(50)
      expect(result.list.every((item) => item.quantity <= 50)).toBe(true)
    })
  })

  // ==================== 财务报表测试 ====================

  describe('getReceivableReport', () => {
    it('should return receivable report', async () => {
      const result = await reportService.getReceivableReport({})

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('summary')
      expect(result.summary).toHaveProperty('totalAmount')
      expect(result.summary).toHaveProperty('totalPaid')
      expect(result.summary).toHaveProperty('totalRemaining')
      expect(result.summary).toHaveProperty('byStatus')
      expect(result.summary).toHaveProperty('byAging')
    })

    it('should filter by customer', async () => {
      const result = await reportService.getReceivableReport({
        customerId: testCustomer1.id,
      })

      expect(result.list.every((item) => item.customer.id === testCustomer1.id)).toBe(true)
    })

    it('should filter by status', async () => {
      const result = await reportService.getReceivableReport({
        status: 'unpaid',
      })

      expect(result.list.every((item) => item.status === 'unpaid')).toBe(true)
    })

    it('should calculate aging correctly', async () => {
      const result = await reportService.getReceivableReport({})

      // 验证账龄分组
      const totalByAging = Object.values(result.summary.byAging).reduce(
        (sum: number, bucket: any) => sum + bucket.count,
        0
      )
      expect(totalByAging).toBe(result.list.length)
    })

    it('should calculate remaining amount correctly', async () => {
      const result = await reportService.getReceivableReport({})

      for (const item of result.list) {
        expect(item.remainingAmount).toBe(item.amount - item.paidAmount)
      }
    })
  })

  describe('getProfitAnalysis', () => {
    it('should return profit analysis', async () => {
      const result = await reportService.getProfitAnalysis({})

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('groupBy')
      expect(result).toHaveProperty('dateRange')
    })

    it('should calculate profit correctly', async () => {
      const result = await reportService.getProfitAnalysis({})

      // 验证利润计算
      expect(result.summary.totalGrossProfit).toBe(
        result.summary.totalRevenue - result.summary.totalCostOfGoods
      )

      // 验证利润率
      if (result.summary.totalRevenue > 0) {
        const expectedMargin = (result.summary.totalGrossProfit / result.summary.totalRevenue) * 100
        expect(result.summary.averageProfitMargin).toBeCloseTo(expectedMargin, 1)
      }
    })

    it('should group by day', async () => {
      const result = await reportService.getProfitAnalysis({ groupBy: 'day' })

      expect(result.groupBy).toBe('day')
      expect(result.list.length).toBeGreaterThan(0)
    })

    it('should group by week', async () => {
      const result = await reportService.getProfitAnalysis({ groupBy: 'week' })

      expect(result.groupBy).toBe('week')
    })

    it('should group by month', async () => {
      const result = await reportService.getProfitAnalysis({ groupBy: 'month' })

      expect(result.groupBy).toBe('month')
    })

    it('should calculate profit margin for each period', async () => {
      const result = await reportService.getProfitAnalysis({})

      for (const item of result.list) {
        if (item.revenue > 0) {
          const expectedMargin = (item.grossProfit / item.revenue) * 100
          expect(item.profitMargin).toBeCloseTo(expectedMargin, 1)
        } else {
          expect(item.profitMargin).toBe(0)
        }
      }
    })

    it('should filter by date range', async () => {
      const today = new Date().toISOString().slice(0, 10)
      const result = await reportService.getProfitAnalysis({
        startDate: today,
        endDate: today,
      })

      // 验证日期范围正确设置
      expect(result.dateRange.start).toBeDefined()
      expect(result.dateRange.end).toBeDefined()
    })
  })
})
