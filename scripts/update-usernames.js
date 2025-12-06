const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update admin
  await prisma.user.update({
    where: { username: 'admin@mbms.com' },
    data: { username: 'admin' }
  });
  console.log('Updated: admin@mbms.com -> admin');

  // Update warren.dulnuan
  await prisma.user.update({
    where: { username: 'warren.dulnuan@mbms.local' },
    data: { username: 'warren' }
  });
  console.log('Updated: warren.dulnuan@mbms.local -> warren');

  // Update bamapcom
  await prisma.user.update({
    where: { username: 'bamapcom@mbms.local' },
    data: { username: 'bamapcom' }
  });
  console.log('Updated: bamapcom@mbms.local -> bamapcom');

  console.log('\nDone! New usernames:');
  const users = await prisma.user.findMany({
    select: { username: true, name: true, role: true }
  });
  users.forEach(u => {
    console.log(`  ${u.username} (${u.name})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
