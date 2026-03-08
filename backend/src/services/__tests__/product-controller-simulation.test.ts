import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as productService from '../product.service'

describe('Controller Parameter Handling Simulation', () => {
  let testCategoryId: number

  beforeAll(async () => {
    // 创建测试分类
    const category = await prisma.category.create({
      data: {
        name: '测试分类-Controller',
        sort: 0,
      },
    })
    testCategoryId = category.id

    // 创建测试商品
    await productService.createProduct({
      code: 'CTRL-TEST-001',
      name: 'Controller测试商品',
      categoryId: testCategoryId,
      unit: '台',
      warranty: 12,
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.sKU.deleteMany({
      where: { code: { contains: 'CTRL-TEST-' } },
    })
    await prisma.product.deleteMany({
      where: { code: { contains: 'CTRL-TEST-' } },
    })
    await prisma.category.delete({
      where: { id: testCategoryId },
    })
  })

  // 模拟 Controller 的参数处理
  describe('模拟 Controller 参数处理', () => {
    it('当 keyword 是 undefined 时，不应该传递 keyword 参数', async () => {
      // 模拟 controller 错误处理: keyword: keyword as string
      const keyword = undefined as any
      const keywordParam = keyword as string  // 这会变成 "undefined" 字符串!

      console.log('keywordParam:', keywordParam, typeof keywordParam)

      // 模拟 service 的处理
      const result = await productService.getProductList({
        keyword: keywordParam,
        page: 1,
        pageSize: 20,
      })

      // 如果 keyword 是 "undefined" 字符串，service 会搜索包含 "undefined" 的记录
      // 这会导致返回空结果，而不是所有记录！
      console.log('Result with keyword="undefined":', result.list.length, result.total)
      
      // 结论：这是一个 BUG！应该只在 keyword 有有效值时才传递
    })

    it('修复后的处理：只在 keyword 有有效值时才传递', async () => {
      const keyword = undefined as any
      
      // 正确的处理方式
      const keywordParam = keyword ? keyword : undefined

      console.log('keywordParam (fixed):', keywordParam)

      const result = await productService.getProductList({
        keyword: keywordParam,
        page: 1,
        pageSize: 20,
      })

      // 现在应该返回所有记录
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.list.length).toBeGreaterThanOrEqual(1)
    })

    it('当 keyword 是空字符串时，应该不传递或传递 undefined', async () => {
      // 模拟 controller 的处理
      const keyword = ''
      const keywordParam = keyword ? keyword : undefined

      console.log('keywordParam (empty string):', keywordParam)

      const result = await productService.getProductList({
        keyword: keywordParam,
        page: 1,
        pageSize: 20,
      })

      // 应该返回所有记录
      expect(result.total).toBeGreaterThanOrEqual(1)
    })
  })
})
