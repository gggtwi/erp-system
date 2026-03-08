import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as productService from '../product.service'

describe('Product Search - Frontend Integration Simulation', () => {
  let testCategoryId: number
  let testProductId: number

  beforeAll(async () => {
    // 创建测试分类
    const category = await prisma.category.create({
      data: {
        name: '测试分类-前端集成',
        sort: 0,
      },
    })
    testCategoryId = category.id

    // 创建测试商品
    const product = await productService.createProduct({
      code: 'FRONTEND-TEST-001',
      name: '前端测试商品A',
      categoryId: testCategoryId,
      unit: '台',
      warranty: 12,
      skus: [
        {
          code: 'FRONTEND-TEST-001-001',
          name: '默认规格',
          price: 100,
          costPrice: 80,
        },
      ],
    })
    testProductId = product.id

    await productService.createProduct({
      code: 'FRONTEND-TEST-002',
      name: '前端测试商品B',
      categoryId: testCategoryId,
      unit: '套',
      warranty: 6,
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.sKU.deleteMany({
      where: { code: { contains: 'FRONTEND-TEST-' } },
    })
    await prisma.product.deleteMany({
      where: { code: { contains: 'FRONTEND-TEST-' } },
    })
    await prisma.category.delete({
      where: { id: testCategoryId },
    })
  })

  // 模拟前端传递的参数
  describe('前端传递参数场景', () => {
    it('场景1: 前端传递空字符串keyword', async () => {
      // 模拟前端: getProducts({ keyword: '', categoryId: undefined, active: undefined, page: 1, pageSize: 20 })
      const result = await productService.getProductList({
        keyword: '',
        page: 1,
        pageSize: 20,
      })

      // 空字符串应该不触发过滤，返回所有商品
      expect(result.total).toBeGreaterThanOrEqual(2)
    })

    it('场景2: 前端传递undefined', async () => {
      // 模拟前端: getProducts({ keyword: undefined, categoryId: undefined, active: undefined, page: 1, pageSize: 20 })
      const result = await productService.getProductList({
        page: 1,
        pageSize: 20,
      })

      expect(result.total).toBeGreaterThanOrEqual(2)
    })

    it('场景3: 前端传递有效的keyword', async () => {
      // 模拟前端: getProducts({ keyword: '前端测试商品A', ... })
      const result = await productService.getProductList({
        keyword: '前端测试商品A',
        page: 1,
        pageSize: 20,
      })

      expect(result.list).toHaveLength(1)
      expect(result.list[0].name).toBe('前端测试商品A')
    })

    it('场景4: 前端传递数字字符串的categoryId', async () => {
      // 模拟 controller 处理: categoryId: categoryId ? parseInt(categoryId as string) : undefined
      const categoryId = String(testCategoryId)
      const parsedCategoryId = categoryId ? parseInt(categoryId) : undefined

      const result = await productService.getProductList({
        categoryId: parsedCategoryId,
        page: 1,
        pageSize: 20,
      })

      expect(result.list.length).toBeGreaterThanOrEqual(2)
    })

    it('场景5: 前端传递字符串"true"或"false"作为active', async () => {
      // 模拟 controller 处理: active: active === 'true' ? true : active === 'false' ? false : undefined
      
      // 先创建一个商品，然后禁用它
      const productToDisable = await productService.createProduct({
        code: 'FRONTEND-TEST-DISABLED',
        name: '测试商品-已禁用',
        categoryId: testCategoryId,
        unit: '个',
        warranty: 3,
      })
      await productService.updateProduct(productToDisable.id, {
        active: false,
      })
      
      // active = 'true' 场景
      const activeTrue = 'true' === 'true' ? true : 'true' === 'false' ? false : undefined
      const result1 = await productService.getProductList({
        active: activeTrue,
        page: 1,
        pageSize: 20,
      })
      expect(result1.list.every(p => p.active === true)).toBe(true)

      // active = 'false' 场景
      const activeFalse = 'false' === 'true' ? true : 'false' === 'false' ? false : undefined
      const result2 = await productService.getProductList({
        active: activeFalse,
        page: 1,
        pageSize: 20,
      })
      // 应该有禁用的商品
      expect(result2.list.some(p => p.code === 'FRONTEND-TEST-DISABLED')).toBe(true)
    })

    it('场景6: 前端传递布尔值false作为active', async () => {
      // 直接传递 false
      const result = await productService.getProductList({
        active: false,
        page: 1,
        pageSize: 20,
      })
      
      // 如果有 active=false 的商品，应该返回
      console.log('Direct false result:', result.list.length)
    })
  })
})
