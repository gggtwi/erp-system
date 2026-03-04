import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as skuService from '../sku.service'

describe('SKU Service', () => {
  let testProduct: any
  let testCategory: any
  let testSKU: any

  beforeAll(async () => {
    // 创建测试分类
    testCategory = await prisma.category.create({
      data: {
        name: '测试分类-SKU',
      },
    })

    // 创建测试商品
    testProduct = await prisma.product.create({
      data: {
        code: 'PROD-SKU-TEST-001',
        name: '测试商品-SKU',
        categoryId: testCategory.id,
        unit: '个',
      },
    })

    // 创建测试 SKU
    testSKU = await prisma.sKU.create({
      data: {
        productId: testProduct.id,
        code: 'SKU-TEST-001',
        name: '测试SKU-001',
        price: 100,
        costPrice: 80,
      },
    })

    // 初始化库存
    await prisma.inventory.create({
      data: {
        skuId: testSKU.id,
        quantity: 0,
        lockedQty: 0,
      },
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.inventory.deleteMany({
      where: {
        skuId: { in: [testSKU?.id].filter(Boolean) },
      },
    })

    await prisma.sKU.deleteMany({
      where: {
        code: { in: ['SKU-TEST-001', 'SKU-TEST-002', 'SKU-ZERO-001', 'SKU-NEGATIVE-001'] },
      },
    })

    await prisma.product.deleteMany({
      where: {
        code: { in: ['PROD-SKU-TEST-001'] },
      },
    })

    await prisma.category.deleteMany({
      where: {
        name: { in: ['测试分类-SKU'] },
      },
    })
  })

  describe('createSKU - 价格校验', () => {
    it('应该拒绝销售价格为 0 的 SKU', async () => {
      await expect(
        skuService.createSKU({
          productId: testProduct.id,
          code: 'SKU-ZERO-001',
          name: '零价格SKU',
          price: 0,
          costPrice: 50,
        })
      ).rejects.toThrow(/销售价格.*大于.*0|价格.*无效/)
    })

    it('应该拒绝销售价格为负数的 SKU', async () => {
      await expect(
        skuService.createSKU({
          productId: testProduct.id,
          code: 'SKU-NEGATIVE-001',
          name: '负价格SKU',
          price: -10,
          costPrice: 50,
        })
      ).rejects.toThrow(/销售价格.*大于.*0|价格.*无效/)
    })

    it('应该拒绝成本价格为 0 的 SKU', async () => {
      await expect(
        skuService.createSKU({
          productId: testProduct.id,
          code: 'SKU-ZERO-001',
          name: '零成本SKU',
          price: 100,
          costPrice: 0,
        })
      ).rejects.toThrow(/成本价格.*大于.*0|价格.*无效/)
    })

    it('应该拒绝成本价格为负数的 SKU', async () => {
      await expect(
        skuService.createSKU({
          productId: testProduct.id,
          code: 'SKU-NEGATIVE-001',
          name: '负成本SKU',
          price: 100,
          costPrice: -5,
        })
      ).rejects.toThrow(/成本价格.*大于.*0|价格.*无效/)
    })

    it('应该成功创建价格有效的 SKU', async () => {
      const result = await skuService.createSKU({
        productId: testProduct.id,
        code: 'SKU-TEST-002',
        name: '正常价格SKU',
        price: 100,
        costPrice: 80,
      })

      expect(result.code).toBe('SKU-TEST-002')
      expect(result.price).toBe(100)
      expect(result.costPrice).toBe(80)
    })
  })

  describe('updateSKU - 价格校验', () => {
    it('应该拒绝将销售价格更新为 0', async () => {
      await expect(
        skuService.updateSKU(testSKU.id, {
          price: 0,
        })
      ).rejects.toThrow(/销售价格.*大于.*0|价格.*无效/)
    })

    it('应该拒绝将销售价格更新为负数', async () => {
      await expect(
        skuService.updateSKU(testSKU.id, {
          price: -10,
        })
      ).rejects.toThrow(/销售价格.*大于.*0|价格.*无效/)
    })

    it('应该拒绝将成本价格更新为 0', async () => {
      await expect(
        skuService.updateSKU(testSKU.id, {
          costPrice: 0,
        })
      ).rejects.toThrow(/成本价格.*大于.*0|价格.*无效/)
    })

    it('应该拒绝将成本价格更新为负数', async () => {
      await expect(
        skuService.updateSKU(testSKU.id, {
          costPrice: -5,
        })
      ).rejects.toThrow(/成本价格.*大于.*0|价格.*无效/)
    })

    it('应该成功更新为有效价格', async () => {
      const result = await skuService.updateSKU(testSKU.id, {
        price: 150,
        costPrice: 120,
      })

      expect(result.price).toBe(150)
      expect(result.costPrice).toBe(120)
    })
  })
})
