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
      // 更新 SKU 的预警阈值为 200，高于当前库存 100
      await prisma.sKU.update({
        where: { id: testSKU.id },
        data: { warningThreshold: 200 },
      })

      const result = await inventoryService.getInventoryList({})

      const item = result.list.find((i) => i.skuId === testSKU.id)
      expect(item?.isLowStock).toBe(true)
      expect(item?.warningThreshold).toBe(200)
      
      // 恢复默认阈值
      await prisma.sKU.update({
        where: { id: testSKU.id },
        data: { warningThreshold: 10 },
      })
    })

    it('should filter low stock only', async () => {
      // 更新 SKU 的预警阈值为 200，高于当前库存 100
      await prisma.sKU.update({
        where: { id: testSKU.id },
        data: { warningThreshold: 200 },
      })

      const result = await inventoryService.getInventoryList({
        lowStock: true,
      })

      expect(result.list.every((i) => i.isLowStock || i.isOutOfStock)).toBe(true)
      
      // 恢复默认阈值
      await prisma.sKU.update({
        where: { id: testSKU.id },
        data: { warningThreshold: 10 },
      })
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

describe('getInventoryStats', () => {
  let testCategory: any
  let testProduct: any
  let testSKUWithInventory: any // SKU with inventory record, quantity > threshold
  let testSKUOutOfStock: any // SKU without inventory record (quantity = 0)
  let testSKULowStock: any // SKU with inventory, quantity <= threshold

  beforeAll(async () => {
    testCategory = await prisma.category.create({
      data: { name: '测试分类-统计', sort: 0 },
    })

    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-STATS-001',
        name: '测试商品-统计',
        categoryId: testCategory.id,
        unit: '台',
      },
    })

    // SKU with inventory, quantity > threshold (not a warning)
    testSKUWithInventory = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-STATS-NORMAL',
        name: '测试SKU-正常库存',
        price: 2999,
        costPrice: 2000,
        warningThreshold: 10,
      },
    })
    await prisma.inventory.create({
      data: {
        skuId: testSKUWithInventory.id,
        quantity: 100,
      },
    })

    // SKU without inventory record (quantity = 0, should be a warning)
    testSKUOutOfStock = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-STATS-OUT',
        name: '测试SKU-缺货',
        price: 1999,
        costPrice: 1000,
        warningThreshold: 10,
      },
    })
    // No inventory record - quantity defaults to 0

    // SKU with inventory, quantity <= threshold (low stock warning)
    testSKULowStock = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-STATS-LOW',
        name: '测试SKU-低库存',
        price: 999,
        costPrice: 500,
        warningThreshold: 10,
      },
    })
    await prisma.inventory.create({
      data: {
        skuId: testSKULowStock.id,
        quantity: 5,
      },
    })
  })

  afterAll(async () => {
    await prisma.inventoryLog.deleteMany({
      where: { skuId: { in: [testSKUWithInventory.id, testSKULowStock.id] } },
    })
    await prisma.inventory.deleteMany({
      where: { skuId: { in: [testSKUWithInventory.id, testSKULowStock.id] } },
    })
    await prisma.sKU.deleteMany({
      where: { id: { in: [testSKUWithInventory.id, testSKUOutOfStock.id, testSKULowStock.id] } },
    })
    await prisma.product.delete({ where: { id: testProduct.id } })
    await prisma.category.delete({ where: { id: testCategory.id } })
  })

  it('should count warnings including SKUs without inventory records', async () => {
    // Get stats - should include all SKUs with quantity <= threshold
    const stats = await inventoryService.getInventoryStats(10)
    
    // Get low stock list - should also include all SKUs with quantity <= threshold
    const listResult = await inventoryService.getInventoryList({ lowStock: true, pageSize: 100 })
    
    // The warningCount should match the count of low stock items
    // Expected: 2 warnings (testSKUOutOfStock with quantity=0, testSKULowStock with quantity=5)
    // But before the fix, it only counts from Inventory table, so it would be 1 (only testSKULowStock)
    expect(stats.warningCount).toBeGreaterThanOrEqual(2)
    
    // More importantly, the warningCount should match getInventoryList lowStock count
    // This is the key test for the bug fix
    const lowStockCount = listResult.list.length
    expect(stats.warningCount).toBe(lowStockCount)
  })
})

describe('Warning Threshold Management', () => {
  let testCategory: any
  let testProduct: any
  let testSKU: any

  beforeAll(async () => {
    testCategory = await prisma.category.create({
      data: { name: '测试分类-阈值', sort: 0 },
    })

    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-THR-001',
        name: '测试商品-阈值',
        categoryId: testCategory.id,
        unit: '台',
      },
    })

    testSKU = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-THR-001',
        name: '测试SKU-阈值',
        price: 1999,
        costPrice: 1000,
        warningThreshold: 10,
      },
    })

    await prisma.inventory.create({
      data: {
        skuId: testSKU.id,
        quantity: 50,
      },
    })
  })

  afterAll(async () => {
    await prisma.inventory.deleteMany({
      where: { skuId: testSKU.id },
    })
    await prisma.sKU.delete({ where: { id: testSKU.id } })
    await prisma.product.delete({ where: { id: testProduct.id } })
    await prisma.category.delete({ where: { id: testCategory.id } })
  })

  describe('updateWarningThreshold', () => {
    it('should update single SKU warning threshold', async () => {
      const result = await inventoryService.updateWarningThreshold(testSKU.id, 20)

      expect(result.skuId).toBe(testSKU.id)
      expect(result.warningThreshold).toBe(20)

      // 验证数据库已更新
      const sku = await prisma.sKU.findUnique({ where: { id: testSKU.id } })
      expect(sku?.warningThreshold).toBe(20)
    })

    it('should reject negative threshold', async () => {
      await expect(
        inventoryService.updateWarningThreshold(testSKU.id, -5)
      ).rejects.toThrow('预警阈值不能为负数')
    })

    it('should reject non-existent SKU', async () => {
      await expect(
        inventoryService.updateWarningThreshold(99999, 10)
      ).rejects.toThrow('SKU不存在')
    })
  })

  describe('batchUpdateWarningThreshold', () => {
    let testSKU2: any

    beforeAll(async () => {
      testSKU2 = await prisma.sKU.create({
        data: {
          productId: testProduct.id,
          code: 'SKU-THR-002',
          name: '测试SKU-阈值2',
          price: 2999,
          costPrice: 1500,
          warningThreshold: 10,
        },
      })
    })

    afterAll(async () => {
      await prisma.sKU.delete({ where: { id: testSKU2.id } })
    })

    it('should batch update warning thresholds', async () => {
      const updates = [
        { skuId: testSKU.id, threshold: 15 },
        { skuId: testSKU2.id, threshold: 25 },
      ]

      const result = await inventoryService.batchUpdateWarningThreshold(updates)

      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)

      // 验证数据库已更新
      const sku1 = await prisma.sKU.findUnique({ where: { id: testSKU.id } })
      const sku2 = await prisma.sKU.findUnique({ where: { id: testSKU2.id } })
      expect(sku1?.warningThreshold).toBe(15)
      expect(sku2?.warningThreshold).toBe(25)
    })

    it('should handle errors in batch update', async () => {
      const updates = [
        { skuId: testSKU.id, threshold: 30 },
        { skuId: 99999, threshold: 10 }, // 不存在的 SKU
        { skuId: testSKU2.id, threshold: -5 }, // 无效阈值
      ]

      const result = await inventoryService.batchUpdateWarningThreshold(updates)

      expect(result.success).toBe(1)
      expect(result.failed).toBe(2)
      expect(result.errors).toHaveLength(2)
    })

    it('should reject empty updates', async () => {
      await expect(
        inventoryService.batchUpdateWarningThreshold([])
      ).rejects.toThrow('更新数据不能为空')
    })
  })
})
