/**
 * 初始化超级管理员账号
 * 运行: node init-superadmin.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const existing = await prisma.user.findFirst({ where: { username: 'admin' }});
  
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'superadmin', password: hashedPassword }
    });
    console.log('✅ 已更新 admin 为超级管理员 (admin/admin123)');
  } else {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        role: 'superadmin',
        status: 'active'
      }
    });
    console.log('✅ 已创建超级管理员账号 (admin/admin123)');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
