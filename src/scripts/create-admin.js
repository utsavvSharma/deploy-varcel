const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  try {
    const username = process.env.ADMIN_USERNAME || 'infobeamadmin';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMeNow!';
    const name = 'InfoBeam Admin';

    const hashed = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findFirst({ where: { username } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { password: hashed, role: 'ADMIN', name } });
      console.log(`✅ Updated existing admin user: ${username}`);
    } else {
      await prisma.user.create({
        data: {
          username,
          name,
          email: null,
          password: hashed,
          role: 'ADMIN',
        },
      });
      console.log(`✅ Created admin user: ${username}`);
    }
  } catch (e) {
    console.error('❌ Failed to create/update admin:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
