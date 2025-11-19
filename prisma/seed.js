 /* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = process.env.SEED_USER_EMAIL || 'demo@example.com';
    const password = process.env.SEED_USER_PASSWORD || 'Password123!';
    const name = process.env.SEED_USER_NAME || 'Demo User';
    const orgName = process.env.SEED_ORG_NAME || 'Demo Org';

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({ data: { email, name, passwordHash } });
      // eslint-disable-next-line no-console
      console.log(`Created user ${email}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`User ${email} already exists`);
    }

    let org = await prisma.organization.findFirst({ where: { name: orgName } });
    if (!org) {
      org = await prisma.organization.create({ data: { name: orgName } });
      await prisma.organizationUser.create({
        data: { orgId: org.id, userId: user.id, role: 'owner' },
      });
      // eslint-disable-next-line no-console
      console.log(`Created org ${orgName} and membership (owner)`);
    } else {
      const membership = await prisma.organizationUser.findUnique({
        where: { orgId_userId: { orgId: org.id, userId: user.id } },
      });
      if (!membership) {
        await prisma.organizationUser.create({ data: { orgId: org.id, userId: user.id, role: 'owner' } });
        // eslint-disable-next-line no-console
        console.log(`Added user to org ${orgName} as owner`);
      }
    }

    // Print quick info
    // eslint-disable-next-line no-console
    console.log('Seed complete. Credentials:');
    // eslint-disable-next-line no-console
    console.log(`Email: ${email}`);
    // eslint-disable-next-line no-console
    console.log(`Password: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
