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
  console.log('Created admin user:', admin.username)

  // 创建分类 - 先检查是否存在
  const existingCats = await prisma.category.findMany()
  let cat1 = existingCats.find(c => c.name === '冰箱')
  let cat2 = existingCats.find(c => c.name === '洗衣机')
  let cat3 = existingCats.find(c => c.name === '空调')
  let cat4 = existingCats.find(c => c.name === '电视')
  let cat5 = existingCats.find(c => c.name === '热水器')

  if (!cat1) cat1 = await prisma.category.create({ data: { name: '冰箱', sort: 1 } })
  if (!cat2) cat2 = await prisma.category.create({ data: { name: '洗衣机', sort: 2 } })
  if (!cat3) cat3 = await prisma.category.create({ data: { name: '空调', sort: 3 } })
  if (!cat4) cat4 = await prisma.category.create({ data: { name: '电视', sort: 4 } })
  if (!cat5) cat5 = await prisma.category.create({ data: { name: '热水器', sort: 5 } })
  console.log('Created/checked categories')

  // 创建演示商品
  const product1 = await prisma.product.upsert({
    where: { code: 'BX001' },
    update: {},
    create: {
      code: 'BX001',
      name: '美的冰箱 BCD-500',
      categoryId: cat1.id,
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
      categoryId: cat2.id,
      brand: '海尔',
      unit: '台',
      warranty: 24,
    },
  })
  console.log('Created products')

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
  console.log('Created SKUs')

  // 创建库存
  await prisma.inventory.upsert({
    where: { skuId: sku1.id },
    update: { quantity: 10 },
    create: { skuId: sku1.id, quantity: 10 },
  })
  await prisma.inventory.upsert({
    where: { skuId: sku2.id },
    update: { quantity: 15 },
    create: { skuId: sku2.id, quantity: 15 },
  })
  console.log('Created inventory')

  // 创建规格类型
  const existingSpecTypes = await prisma.specType.findMany()
  if (existingSpecTypes.length === 0) {
    await prisma.specType.createMany({
      data: [
        { name: '颜色', sort: 1 },
        { name: '尺码', sort: 2 },
        { name: '容量', sort: 3 },
        { name: '功率', sort: 4 },
        { name: '型号', sort: 5 },
      ],
    })
    console.log('Created spec types: 颜色, 尺码, 容量, 功率, 型号')
  } else {
    console.log('Spec types already exist')
  }

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
  console.log('Created customer')

  console.log('\n✅ Seed data created successfully!')
  console.log('📝 Admin user: admin / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
