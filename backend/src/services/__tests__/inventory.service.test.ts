import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as inventoryService from '../inventory.service'

describe('Inventory Service', () => {
  let testCategory: any
  let testProduct: any
  let testSKU: any
  let testUser: any

  beforeAll(async () => {
    // 创建测试分类
    testCategory = await prisma.category.create({
      data: { name: '测试分类-库存', sort: 0 },
    })

    // 创建测试商品
    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-INV-001',
        name: '测试商品-库存',
        categoryId: testCategory.id,
        unit: '台',
        warranty: 12,
      },
    })

    // 创建测试 SKU
    testSKU = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-INV-001',
        name: '测试SKU-库存',
        price: 2999,
        costPrice: 2000,
      },
    })

    // 初始化库存
    await prisma.inventory.create({
      data: {
        skuId: testSKU.id,
        quantity: 100,
        lockedQty: 10,
      },
    })

    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        username: 'test-inventory-user',
        password: 'hashed_password',
        name: '测试用户',
        role: 'admin',
      },
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.inventoryLog.deleteMany({
      where: { skuId: testSKU.id },
    })
    await prisma.serialNumber.deleteMany({
      where: { skuId: testSKU.id },
    })
    await prisma.inventory.deleteMany({
      where: { skuId: testSKU.id },
    })
    await prisma.sKU.delete({ where: { id: testSKU.id } })
    await prisma.product.delete({ where: { id: testProduct.id } })
    await prisma.category.delete({ where: { id: testCategory.id } })
    await prisma.user.delete({ where: { id: testUser.id } })
  })

  describe('getInventoryList', () => {
    it('should return inventory list with pagination', async () => {
      const result = await inventoryService.getInventoryList({})

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page', 1)
      expect(result).toHaveProperty('pageSize', 20)
    })

    it('should filter by keyword', async () => {
      const result = await inventoryService.getInventoryList({
        keyword: 'SKU-INV',
      })

      expect(result.list.length).toBeGreaterThan(0)
      expect(result.list[0].skuCode).toContain('SKU-INV')
    })

    it('should filter by category', async () => {
      const result = await inventoryService.getInventoryList({
        categoryId: testCategory.id,
      })

      expect(result.list.length).toBeGreaterThan(0)
      expect(result.list[0].categoryId).toBe(testCategory.id)
    })

    it('should identify low stock items', async () => {
      const result = await inventoryService.getInventoryList({
        warningThreshold: 200, // 高于当前库存
      })

      const item = result.list.find((i) => i.skuId === testSKU.id)
      expect(item?.isLowStock).toBe(true)
    })

    it('should filter low stock only', async () => {
      const result = await inventoryService.getInventoryList({
        lowStock: true,
        warningThreshold: 200,
      })

      expect(result.list.every((i) => i.isLowStock || i.isOutOfStock)).toBe(true)
    })
  })

  describe('getInventoryDetail', () => {
    it('should return inventory detail', async () => {
      const result = await inventoryService.getInventoryDetail(testSKU.id)

      expect(result.skuId).toBe(testSKU.id)
      expect(result.skuCode).toBe(testSKU.code)
      expect(result.quantity).toBe(100)
      expect(result.lockedQty).toBe(10)
      expect(result.availableQty).toBe(90)
      expect(result).toHaveProperty('recentLogs')
    })

    it('should throw error for non-existent SKU', async () => {
      await expect(inventoryService.getInventoryDetail(99999)).rejects.toThrow(
        'SKU不存在'
      )
    })
  })

  describe('adjustInventory', () => {
    it('should increase inventory (in)', async () => {
      const result = await inventoryService.adjustInventory(
        {
          skuId: testSKU.id,
          quantity: 10,
          type: 'in',
          remark: '入库测试',
        },
        testUser.id
      )

      expect(result.beforeQty).toBe(100)
      expect(result.afterQty).toBe(110)
      expect(result.change).toBe(10)
    })

    it('should decrease inventory (out)', async () => {
      const result = await inventoryService.adjustInventory(
        {
          skuId: testSKU.id,
          quantity: 5,
          type: 'out',
          remark: '出库测试',
        },
        testUser.id
      )

      expect(result.beforeQty).toBe(110)
      expect(result.afterQty).toBe(105)
      expect(result.change).toBe(-5)
    })

    it('should set inventory (adjust)', async () => {
      const result = await inventoryService.adjustInventory(
        {
          skuId: testSKU.id,
          quantity: 50,
          type: 'adjust',
          remark: '盘点测试',
        },
        testUser.id
      )

      expect(result.beforeQty).toBe(105)
      expect(result.afterQty).toBe(50)
      expect(result.change).toBe(-55)
    })

    it('should throw error for insufficient stock', async () => {
      await expect(
        inventoryService.adjustInventory(
          {
            skuId: testSKU.id,
            quantity: 100,
            type: 'out',
          },
          testUser.id
        )
      ).rejects.toThrow('库存不足')
    })

    it('should throw error for negative stock (adjust)', async () => {
      await expect(
        inventoryService.adjustInventory(
          {
            skuId: testSKU.id,
            quantity: -10,
            type: 'adjust',
          },
          testUser.id
        )
      ).rejects.toThrow('库存不能为负数')
    })
  })

  describe('getInventoryLogs', () => {
    it('should return logs with pagination', async () => {
      const result = await inventoryService.getInventoryLogs({
        skuId: testSKU.id,
      })

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('total')
      expect(result.list.length).toBeGreaterThan(0)
      expect(result.list[0]).toHaveProperty('typeText')
    })

    it('should filter by type', async () => {
      const result = await inventoryService.getInventoryLogs({
        skuId: testSKU.id,
        type: 'adjust',
      })

      expect(result.list.every((log) => log.type === 'adjust')).toBe(true)
    })
  })
})

describe('Serial Number Service', () => {
  let testCategory: any
  let testProduct: any
  let testSKU: any
  let testUser: any

  beforeAll(async () => {
    testCategory = await prisma.category.create({
      data: { name: '测试分类-序列号', sort: 0 },
    })

    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-SN-001',
        name: '测试商品-序列号',
        categoryId: testCategory.id,
        unit: '台',
        warranty: 24,
      },
    })

    testSKU = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-SN-001',
        name: '测试SKU-序列号',
        price: 5999,
        costPrice: 4000,
      },
    })

    testUser = await prisma.user.create({
      data: {
        username: 'test-serial-user',
        password: 'hashed_password',
        name: '测试用户',
        role: 'warehouse',
      },
    })
  })

  afterAll(async () => {
    await prisma.inventoryLog.deleteMany({
      where: { skuId: testSKU.id },
    })
    await prisma.serialNumber.deleteMany({
      where: { skuId: testSKU.id },
    })
    await prisma.inventory.deleteMany({
      where: { skuId: testSKU.id },
    })
    await prisma.sKU.delete({ where: { id: testSKU.id } })
    await prisma.product.delete({ where: { id: testProduct.id } })
    await prisma.category.delete({ where: { id: testCategory.id } })
    await prisma.user.delete({ where: { id: testUser.id } })
  })

  describe('createSerialNumbers', () => {
    it('should create serial numbers', async () => {
      const result = await inventoryService.createSerialNumbers(
        {
          skuId: testSKU.id,
          serialNos: ['SN001', 'SN002', 'SN003'],
        },
        testUser.id
      )

      expect(result.count).toBe(3)
      expect(result.serialNos).toHaveLength(3)
      expect(result.newQuantity).toBe(3)
    })

    it('should reject duplicate serial numbers', async () => {
      await expect(
        inventoryService.createSerialNumbers(
          {
            skuId: testSKU.id,
            serialNos: ['SN001'],
          },
          testUser.id
        )
      ).rejects.toThrow('已存在')
    })

    it('should reject empty serial numbers', async () => {
      await expect(
        inventoryService.createSerialNumbers(
          {
            skuId: testSKU.id,
            serialNos: [],
          },
          testUser.id
        )
      ).rejects.toThrow('请输入序列号')
    })
  })

  describe('getSerialNumberList', () => {
    it('should return serial number list with pagination', async () => {
      const result = await inventoryService.getSerialNumberList({
        skuId: testSKU.id,
      })

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('total')
      expect(result.list.length).toBe(3)
    })

    it('should filter by status', async () => {
      const result = await inventoryService.getSerialNumberList({
        skuId: testSKU.id,
        status: 'in_stock',
      })

      expect(result.list.every((sn) => sn.status === 'in_stock')).toBe(true)
    })

    it('should filter by keyword', async () => {
      const result = await inventoryService.getSerialNumberList({
        skuId: testSKU.id,
        keyword: 'SN001',
      })

      expect(result.list.length).toBe(1)
      expect(result.list[0].serialNo).toBe('SN001')
    })
  })

  describe('getSerialNumberDetail', () => {
    it('should return serial number detail for warranty query', async () => {
      const result = await inventoryService.getSerialNumberDetail('SN001')

      expect(result.serialNo).toBe('SN001')
      expect(result.status).toBe('in_stock')
      expect(result.statusText).toBe('在库')
      expect(result).toHaveProperty('product')
      expect(result).toHaveProperty('sku')
      expect(result).toHaveProperty('warranty')
      expect(result.warranty.months).toBe(24)
      expect(result.warranty.expired).toBe(false)
    })

    it('should throw error for non-existent serial number', async () => {
      await expect(
        inventoryService.getSerialNumberDetail('NONEXISTENT')
      ).rejects.toThrow('序列号不存在')
    })
  })
})

describe('Inventory Warning', () => {
  let testCategory: any
  let testProduct: any
  let lowStockSKU: any

  beforeAll(async () => {
    testCategory = await prisma.category.create({
      data: { name: '测试分类-预警', sort: 0 },
    })

    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-WARN-001',
        name: '测试商品-预警',
        categoryId: testCategory.id,
        unit: '台',
      },
    })

    lowStockSKU = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-WARN-001',
        name: '测试SKU-预警',
        price: 999,
        costPrice: 500,
      },
    })

    await prisma.inventory.create({
      data: {
        skuId: lowStockSKU.id,
        quantity: 3,
      },
    })
  })

  afterAll(async () => {
    await prisma.inventoryLog.deleteMany({
      where: { skuId: lowStockSKU.id },
    })
    await prisma.inventory.deleteMany({
      where: { skuId: lowStockSKU.id },
    })
    await prisma.sKU.delete({ where: { id: lowStockSKU.id } })
    await prisma.product.delete({ where: { id: testProduct.id } })
    await prisma.category.delete({ where: { id: testCategory.id } })
  })

  it('should return low stock items', async () => {
    const result = await inventoryService.getInventoryWarning({ threshold: 10 })

    expect(result.length).toBeGreaterThan(0)
    const item = result.find((i) => i.skuId === lowStockSKU.id)
    expect(item).toBeDefined()
    expect(item?.quantity).toBe(3)
    expect(item?.shortage).toBe(7)
  })
})
