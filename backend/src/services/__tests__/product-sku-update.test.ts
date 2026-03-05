import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as productService from '../product.service'

describe('Product SKU Update', () => {
  let testProductId: number
  let testCategoryId: number

  beforeAll(async () => {
    // 创建测试分类
    const category = await prisma.category.create({
      data: {
        name: '测试分类-SKU更新',
        sort: 0,
      },
    })
    testCategoryId = category.id
  })

  beforeEach(async () => {
    // 每个测试前清理并重新创建测试商品
    await prisma.sKU.deleteMany({
      where: {
        code: { contains: 'TEST-SKU-UPDATE' },
      },
    })
    await prisma.product.deleteMany({
      where: {
        code: { contains: 'TEST-SKU-UPDATE' },
      },
    })

    // 创建测试商品
    const product = await productService.createProduct({
      code: 'TEST-SKU-UPDATE-001',
      name: '测试商品-SKU更新',
      categoryId: testCategoryId,
      unit: '台',
      warranty: 12,
      skus: [
        {
          code: 'TEST-SKU-UPDATE-001-001',
          name: '默认规格',
          price: 100,
          costPrice: 80,
        },
      ],
    })
    testProductId = product.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.sKU.deleteMany({
      where: {
        code: { contains: 'TEST-SKU-UPDATE' },
      },
    })
    await prisma.product.deleteMany({
      where: {
        code: { contains: 'TEST-SKU-UPDATE' },
      },
    })
    await prisma.category.delete({
      where: { id: testCategoryId },
    })
  })

  it('应该能够添加新的 SKU', async () => {
    const product = await productService.getProductById(testProductId)
    expect(product.skus.length).toBe(1)

    // 添加新 SKU
    const updated = await productService.updateProduct(testProductId, {
      name: product.name,
      skus: [
        {
          id: product.skus[0].id,
          code: product.skus[0].code,
          name: product.skus[0].name,
          price: product.skus[0].price,
          costPrice: product.skus[0].costPrice,
        },
        {
          code: 'TEST-SKU-UPDATE-001-002',
          name: '新规格',
          price: 150,
          costPrice: 120,
        },
      ],
    })

    expect(updated).toBeDefined()
    expect(updated!.skus.length).toBe(2)
    expect(updated!.skus.find(s => s.name === '新规格')).toBeDefined()
  })

  it('应该能够更新现有 SKU', async () => {
    const product = await productService.getProductById(testProductId)
    const sku = product.skus.find(s => s.name === '默认规格')
    expect(sku).toBeDefined()

    // 更新 SKU
    const updated = await productService.updateProduct(testProductId, {
      name: product.name,
      skus: [
        {
          id: sku!.id,
          code: sku!.code,
          name: '更新后的规格',
          price: 200,
          costPrice: 150,
        },
      ],
    })

    expect(updated).toBeDefined()
    expect(updated!.skus.length).toBe(1)
    const updatedSku = updated!.skus.find(s => s.id === sku!.id)
    expect(updatedSku).toBeDefined()
    expect(updatedSku!.name).toBe('更新后的规格')
    expect(updatedSku!.price).toBe(200)
  })

  it('应该能够删除 SKU（通过 _delete 标记）', async () => {
    // 先添加一个 SKU
    const product1 = await productService.getProductById(testProductId)
    await productService.updateProduct(testProductId, {
      name: product1.name,
      skus: [
        {
          id: product1.skus[0].id,
          code: product1.skus[0].code,
          name: product1.skus[0].name,
          price: product1.skus[0].price,
          costPrice: product1.skus[0].costPrice,
        },
        {
          code: 'TEST-SKU-UPDATE-001-002',
          name: '要删除的规格',
          price: 150,
          costPrice: 120,
        },
      ],
    })

    // 验证有两个 SKU
    const product2 = await productService.getProductById(testProductId)
    expect(product2.skus.length).toBe(2)

    const skuToDelete = product2.skus.find(s => s.name === '要删除的规格')
    expect(skuToDelete).toBeDefined()

    // 删除 SKU（通过标记 _delete）
    const updated = await productService.updateProduct(testProductId, {
      name: product2.name,
      skus: [
        {
          id: product2.skus.find(s => s.name === '默认规格')!.id,
          code: product2.skus.find(s => s.name === '默认规格')!.code,
          name: '默认规格',
          price: 100,
          costPrice: 80,
        },
        {
          id: skuToDelete!.id,
          code: skuToDelete!.code,
          name: '要删除的规格',
          price: 150,
          costPrice: 120,
          _delete: true,
        },
      ],
    })

    expect(updated).toBeDefined()
    expect(updated!.skus.length).toBe(1)
    expect(updated!.skus.find(s => s.name === '要删除的规格')).toBeUndefined()
  })

  it('应该能够同时添加和更新 SKU', async () => {
    const product = await productService.getProductById(testProductId)
    const existingSku = product.skus[0]
    expect(existingSku).toBeDefined()

    // 复杂操作：更新现有 SKU + 添加新 SKU
    const updated = await productService.updateProduct(testProductId, {
      name: product.name,
      skus: [
        {
          id: existingSku.id,
          code: existingSku.code,
          name: '更新后的规格',
          price: 300,
          costPrice: 200,
        },
        {
          code: 'TEST-SKU-UPDATE-001-NEW',
          name: '全新规格',
          price: 500,
          costPrice: 350,
        },
      ],
    })

    expect(updated).toBeDefined()
    expect(updated!.skus.length).toBe(2)
    
    const updatedSku = updated!.skus.find(s => s.id === existingSku.id)
    expect(updatedSku).toBeDefined()
    expect(updatedSku!.name).toBe('更新后的规格')
    expect(updatedSku!.price).toBe(300)
    
    const newSku = updated!.skus.find(s => s.name === '全新规格')
    expect(newSku).toBeDefined()
    expect(newSku!.price).toBe(500)
  })

  it('应该拒绝已被其他商品使用的 SKU 编码', async () => {
    // 创建另一个商品
    const otherProduct = await productService.createProduct({
      code: 'TEST-SKU-UPDATE-002',
      name: '其他商品',
      categoryId: testCategoryId,
      unit: '台',
      warranty: 12,
      skus: [
        {
          code: 'TEST-SKU-UPDATE-002-001',
          name: '其他商品规格',
          price: 100,
          costPrice: 80,
        },
      ],
    })

    const product = await productService.getProductById(testProductId)
    
    // 尝试使用另一个商品的 SKU 编码
    await expect(
      productService.updateProduct(testProductId, {
        name: product.name,
        skus: [
          {
            code: 'TEST-SKU-UPDATE-002-001', // 另一个商品的 SKU 编码
            name: '冲突规格',
            price: 150,
            costPrice: 100,
          },
        ],
      })
    ).rejects.toThrow('SKU 编码 "TEST-SKU-UPDATE-002-001" 已被其他商品使用')

    // 清理
    await prisma.sKU.deleteMany({
      where: { productId: otherProduct.id },
    })
    await prisma.product.delete({
      where: { id: otherProduct.id },
    })
  })
})
