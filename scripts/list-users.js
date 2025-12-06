const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { username: true, name: true, role: true }
  });
  console.log('\nCurrent Users:');
  console.log('==============');
  users.forEach(u => {
    console.log(`Username: ${u.username} | Name: ${u.name} | Role: ${u.role}`);
  });
}

main()
  .finally(() => prisma.$disconnect());
