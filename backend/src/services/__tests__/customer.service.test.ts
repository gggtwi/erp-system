import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma'
import * as customerService from '../customer.service'

describe('Customer Service', () => {
  let testCustomer: any
  let testCustomer2: any

  beforeAll(async () => {
    // 创建测试客户
    testCustomer = await prisma.customer.create({
      data: {
        code: 'CUST-TEST-001',
        name: '测试客户一',
        phone: '13800138001',
        address: '测试地址一',
        creditLimit: 10000,
      },
    })

    testCustomer2 = await prisma.customer.create({
      data: {
        code: 'CUST-TEST-002',
        name: '测试客户二',
        phone: '13800138002',
        address: '测试地址二',
        creditLimit: 5000,
        balance: 1000,
      },
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.customer.deleteMany({
      where: {
        code: { in: ['CUST-TEST-001', 'CUST-TEST-002', 'CUST-NEW-001'] },
      },
    })
  })

  describe('getCustomerList', () => {
    it('should return customer list with pagination', async () => {
      const result = await customerService.getCustomerList({})

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page', 1)
      expect(result).toHaveProperty('pageSize', 20)
    })

    it('should filter by keyword (name)', async () => {
      const result = await customerService.getCustomerList({
        keyword: '测试客户一',
      })

      expect(result.list.length).toBeGreaterThan(0)
      expect(result.list[0].name).toContain('测试客户一')
    })

    it('should filter by keyword (phone)', async () => {
      const result = await customerService.getCustomerList({
        keyword: '13800138001',
      })

      expect(result.list.length).toBeGreaterThan(0)
      expect(result.list[0].phone).toBe('13800138001')
    })

    it('should filter by status', async () => {
      const result = await customerService.getCustomerList({
        status: 'normal',
      })

      expect(result.list.every((c) => c.status === 'normal')).toBe(true)
    })

    it('should support pagination', async () => {
      const result = await customerService.getCustomerList({
        page: 1,
        pageSize: 1,
      })

      expect(result.list.length).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(1)
    })
  })

  describe('getCustomerById', () => {
    it('should return customer detail with sales', async () => {
      const result = await customerService.getCustomerById(testCustomer.id)

      expect(result.id).toBe(testCustomer.id)
      expect(result.name).toBe('测试客户一')
      expect(result).toHaveProperty('sales')
      expect(result).toHaveProperty('receivables')
    })

    it('should throw error for non-existent customer', async () => {
      await expect(customerService.getCustomerById(99999)).rejects.toThrow(
        '客户不存在'
      )
    })
  })

  describe('getCustomerByCode', () => {
    it('should return customer by code', async () => {
      const result = await customerService.getCustomerByCode('CUST-TEST-001')

      expect(result.code).toBe('CUST-TEST-001')
      expect(result.name).toBe('测试客户一')
    })

    it('should throw error for non-existent code', async () => {
      await expect(
        customerService.getCustomerByCode('NONEXISTENT')
      ).rejects.toThrow('客户不存在')
    })
  })

  describe('createCustomer', () => {
    it('should create a new customer', async () => {
      const result = await customerService.createCustomer({
        code: 'CUST-NEW-001',
        name: '新建客户',
        phone: '15900159000',
        address: '新地址',
        creditLimit: 8000,
      })

      expect(result.code).toBe('CUST-NEW-001')
      expect(result.name).toBe('新建客户')
      expect(result.phone).toBe('15900159000')
      expect(result.creditLimit).toBe(8000)
      expect(result.balance).toBe(0)
      expect(result.status).toBe('normal')
    })

    it('should reject duplicate code', async () => {
      await expect(
        customerService.createCustomer({
          code: 'CUST-TEST-001',
          name: '重复编码客户',
        })
      ).rejects.toThrow('客户编码已存在')
    })

    it('should reject duplicate phone', async () => {
      await expect(
        customerService.createCustomer({
          code: 'CUST-NEW-002',
          name: '重复手机客户',
          phone: '13800138001',
        })
      ).rejects.toThrow('手机号已存在')
    })
  })

  describe('updateCustomer', () => {
    it('should update customer info', async () => {
      const result = await customerService.updateCustomer(testCustomer.id, {
        name: '更新后客户名',
        address: '更新后地址',
      })

      expect(result.name).toBe('更新后客户名')
      expect(result.address).toBe('更新后地址')
    })

    it('should throw error for non-existent customer', async () => {
      await expect(
        customerService.updateCustomer(99999, { name: '不存在' })
      ).rejects.toThrow('客户不存在')
    })

    it('should reject duplicate phone on update', async () => {
      await expect(
        customerService.updateCustomer(testCustomer.id, {
          phone: '13800138002',
        })
      ).rejects.toThrow('手机号已存在')
    })
  })

  describe('getCustomerHistory', () => {
    it('should return customer purchase history', async () => {
      const result = await customerService.getCustomerHistory(testCustomer.id, {
        page: 1,
        pageSize: 10,
      })

      expect(result).toHaveProperty('customer')
      expect(result.customer.id).toBe(testCustomer.id)
      expect(result).toHaveProperty('sales')
      expect(result).toHaveProperty('total')
    })

    it('should throw error for non-existent customer', async () => {
      await expect(
        customerService.getCustomerHistory(99999, { page: 1 })
      ).rejects.toThrow('客户不存在')
    })
  })

  describe('getCustomerDebt', () => {
    it('should return customer debt info', async () => {
      const result = await customerService.getCustomerDebt(testCustomer2.id)

      expect(result.customer.id).toBe(testCustomer2.id)
      expect(result).toHaveProperty('totalDebt')
      expect(result).toHaveProperty('receivables')
      expect(result).toHaveProperty('availableCredit')
      expect(result.availableCredit).toBe(4000) // 5000 - 1000
    })

    it('should throw error for non-existent customer', async () => {
      await expect(customerService.getCustomerDebt(99999)).rejects.toThrow(
        '客户不存在'
      )
    })
  })
})
