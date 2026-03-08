const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.sale.updateMany({
    where: { orderNo: { in: ['SO202603080001', 'SO202603080002'] }},
    data: { paidAmount: 8999, debtAmount: 0, paymentStatus: 'paid' }
  });
  console.log('Updated:', result);
  
  // Verify
  const orders = await prisma.sale.findMany({
    where: { orderNo: { in: ['SO202603080001', 'SO202603080002'] }}
  });
  console.log('Orders:', orders);
}

main();
