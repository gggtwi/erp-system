import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 创建管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: 'admin',
      phone: '13800138000',
    },
  })

  // 创建分类
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 1 },
      update: {},
      create: { name: '冰箱', sort: 1 },
    }),
    prisma.category.upsert({
      where: { id: 2 },
      update: {},
      create: { name: '洗衣机', sort: 2 },
    }),
    prisma.category.upsert({
      where: { id: 3 },
      update: {},
      create: { name: '空调', sort: 3 },
    }),
    prisma.category.upsert({
      where: { id: 4 },
      update: {},
      create: { name: '电视', sort: 4 },
    }),
    prisma.category.upsert({
      where: { id: 5 },
      update: {},
      create: { name: '热水器', sort: 5 },
    }),
  ])

  // 创建演示商品
  const product1 = await prisma.product.upsert({
    where: { code: 'BX001' },
    update: {},
    create: {
      code: 'BX001',
      name: '美的冰箱 BCD-500',
      categoryId: 1,
      brand: '美的',
      unit: '台',
      warranty: 36,
    },
  })

  const product2 = await prisma.product.upsert({
    where: { code: 'XYJ001' },
    update: {},
    create: {
      code: 'XYJ001',
      name: '海尔洗衣机 EG100',
      categoryId: 2,
      brand: '海尔',
      unit: '台',
      warranty: 24,
    },
  })

  // 创建 SKU
  const sku1 = await prisma.sKU.upsert({
    where: { code: 'BX001-001' },
    update: {},
    create: {
      code: 'BX001-001',
      productId: product1.id,
      name: '白色 500L',
      specs: '{"color":"白色","capacity":"500L"}',
      price: 3999,
      costPrice: 2800,
      barcode: '6901234567890',
    },
  })

  const sku2 = await prisma.sKU.upsert({
    where: { code: 'XYJ001-001' },
    update: {},
    create: {
      code: 'XYJ001-001',
      productId: product2.id,
      name: '白色 10KG',
      specs: '{"color":"白色","capacity":"10KG"}',
      price: 2999,
      costPrice: 2000,
      barcode: '6901234567891',
    },
  })

  // 创建库存
  await prisma.inventory.upsert({
    where: { skuId: sku1.id },
    update: {},
    create: { skuId: sku1.id, quantity: 10 },
  })

  await prisma.inventory.upsert({
    where: { skuId: sku2.id },
    update: {},
    create: { skuId: sku2.id, quantity: 15 },
  })

  // 创建演示客户
  await prisma.customer.upsert({
    where: { code: 'C001' },
    update: {},
    create: {
      code: 'C001',
      name: '张三',
      phone: '13900139000',
      address: '北京市朝阳区xxx',
      creditLimit: 10000,
    },
  })

  console.log('Seed data created successfully!')
  console.log('Admin user: admin / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
