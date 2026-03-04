import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Prisma Connection', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should connect to database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`
    expect(result).toBeDefined()
  })

  it('should have User model', async () => {
    // 尝试查询 User 表，确认模型存在
    const count = await prisma.user.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
