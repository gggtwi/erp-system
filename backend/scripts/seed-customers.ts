import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始添加客户测试数据...')

  const customers = [
    {
      code: 'VIP001',
      name: '张三',
      phone: '13800138001',
      address: '北京市朝阳区建国路88号',
      creditLimit: 50000,
    },
    {
      code: 'VIP002',
      name: '李四',
      phone: '13800138002',
      address: '上海市浦东新区陆家嘴金融中心',
      creditLimit: 30000,
      balance: 1500.50,
    },
    {
      code: 'VIP003',
      name: '王五',
      phone: '13800138003',
      address: '广州市天河区体育西路103号',
      creditLimit: 20000,
    },
    {
      code: 'MEM001',
      name: '赵六',
      phone: '13900139001',
      address: '深圳市南山区科技园',
      creditLimit: 10000,
      balance: 3200,
    },
    {
      code: 'MEM002',
      name: '钱七',
      phone: '13900139002',
      address: '杭州市西湖区文三路',
      creditLimit: 10000,
    },
    {
      code: 'MEM003',
      name: '孙八',
      phone: '13900139003',
      address: '成都市高新区天府大道',
      creditLimit: 15000,
      balance: 800,
    },
    {
      code: 'MEM004',
      name: '周九',
      phone: '13900139004',
      address: '武汉市武昌区中南路',
      creditLimit: 8000,
    },
    {
      code: 'MEM005',
      name: '吴十',
      phone: '13900139005',
      address: '南京市鼓楼区中山路',
      creditLimit: 12000,
    },
    {
      code: 'TMP2025030401',
      name: '临时客户-TMP2025030401',
      creditLimit: 0,
    },
    {
      code: 'TMP2025030402',
      name: '临时客户-TMP2025030402',
      creditLimit: 0,
    },
  ]

  for (const customer of customers) {
    try {
      await prisma.customer.create({
        data: customer,
      })
      console.log(`✓ 创建客户: ${customer.code} - ${customer.name}`)
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`- 客户已存在: ${customer.code}`)
      } else {
        console.error(`✗ 创建客户失败: ${customer.code}`, error.message)
      }
    }
  }

  console.log('\n客户测试数据添加完成！')
  console.log('---')
  console.log('测试客户列表：')
  console.log('  VIP 客户: VIP001-VIP003 (张三、李四、王五)')
  console.log('  普通会员: MEM001-MEM005 (赵六、钱七、孙八、周九、吴十)')
  console.log('  临时客户: TMP2025030401, TMP2025030402')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
