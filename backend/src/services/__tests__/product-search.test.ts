import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as productService from '../product.service'

describe('Product Search Filtering', () => {
  let testCategoryId: number

  beforeAll(async () => {
    // 创建测试分类
    const category = await prisma.category.create({
      data: {
        name: '测试分类-搜索',
        sort: 0,
      },
    })
    testCategoryId = category.id
  })

  beforeEach(async () => {
    // 清理测试数据
    await prisma.sKU.deleteMany({
      where: { code: { contains: 'TEST-SEARCH-' } },
    })
    await prisma.product.deleteMany({
      where: { code: { contains: 'TEST-SEARCH-' } },
    })

    // 创建多个测试商品
    await productService.createProduct({
      code: 'TEST-SEARCH-001',
      name: '测试商品A',
      categoryId: testCategoryId,
      unit: '台',
      warranty: 12,
      skus: [
        {
          code: 'TEST-SEARCH-001-001',
          name: '默认规格',
          price: 100,
          costPrice: 80,
        },
      ],
    })

    await productService.createProduct({
      code: 'TEST-SEARCH-002',
      name: '测试商品B',
      categoryId: testCategoryId,
      unit: '套',
      warranty: 6,
      skus: [
        {
          code: 'TEST-SEARCH-002-001',
          name: '默认规格',
          price: 200,
          costPrice: 150,
        },
      ],
    })

    // 创建一个禁用的商品
    await productService.createProduct({
      code: 'TEST-SEARCH-003',
      name: '测试商品C-禁用',
      categoryId: testCategoryId,
      unit: '个',
      warranty: 3,
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.sKU.deleteMany({
      where: { code: { contains: 'TEST-SEARCH-' } },
    })
    await prisma.product.deleteMany({
      where: { code: { contains: 'TEST-SEARCH-' } },
    })
    await prisma.category.delete({
      where: { id: testCategoryId },
    })
  })

  it('应该能搜索关键词（商品名称）', async () => {
    const result = await productService.getProductList({
      keyword: '测试商品A',
      page: 1,
      pageSize: 20,
    })

    expect(result.list).toHaveLength(1)
    expect(result.list[0].name).toBe('测试商品A')
  })

  it('应该能搜索关键词（商品编码）', async () => {
    const result = await productService.getProductList({
      keyword: 'TEST-SEARCH-001',
      page: 1,
      pageSize: 20,
    })

    expect(result.list).toHaveLength(1)
    expect(result.list[0].code).toBe('TEST-SEARCH-001')
  })

  it('应该能按分类过滤', async () => {
    const result = await productService.getProductList({
      categoryId: testCategoryId,
      page: 1,
      pageSize: 20,
    })

    // 应该返回该分类下的所有商品
    expect(result.list.length).toBeGreaterThanOrEqual(3)
  })

  it('应该能按状态过滤（启用）', async () => {
    const result = await productService.getProductList({
      active: true,
      page: 1,
      pageSize: 20,
    })

    // 所有启用的商品
    expect(result.list.length).toBeGreaterThanOrEqual(2)
    expect(result.list.every(p => p.active === true)).toBe(true)
  })

  it('应该能按状态过滤（禁用）', async () => {
    // 先创建一个商品，然后禁用它
    const productToDisable = await productService.createProduct({
      code: 'TEST-SEARCH-DISABLED',
      name: '测试商品-已禁用',
      categoryId: testCategoryId,
      unit: '个',
      warranty: 3,
    })
    
    // 禁用该商品
    await productService.updateProduct(productToDisable.id, {
      active: false,
    })

    // 搜索禁用的商品
    const result = await productService.getProductList({
      active: false,
      page: 1,
      pageSize: 20,
    })

    // 应该能返回禁用的商品
    expect(result.list.length).toBeGreaterThanOrEqual(1)
    expect(result.list.some(p => p.code === 'TEST-SEARCH-DISABLED')).toBe(true)
  })

  it('应该能组合搜索（关键词 + 状态）', async () => {
    const result = await productService.getProductList({
      keyword: '测试商品',
      active: true,
      page: 1,
      pageSize: 20,
    })

    // 应该只返回启用的商品
    expect(result.list.every(p => p.active === true)).toBe(true)
    expect(result.list.every(p => p.name.includes('测试商品'))).toBe(true)
  })

  it('应该能分页', async () => {
    const result = await productService.getProductList({
      page: 1,
      pageSize: 1,
    })

    expect(result.list).toHaveLength(1)
    expect(result.totalPages).toBeGreaterThanOrEqual(3)
  })
})
