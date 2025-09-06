// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
  console.log('DATABASE_URL =', process.env.DATABASE_URL);

  const hashed = await argon2.hash('password123'); // ← ARGON2

  // diagnostyka PRZED
  const totalBefore = await prisma.restaurant.count();
  const [{ count: nullBefore }] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "Restaurant" WHERE "ownerId" IS NULL`,
  );
  console.log(
    `Restaurants total: ${totalBefore}, without ownerId: ${nullBefore}`,
  );

  // napraw sekwencję (bezpieczne, opcjonalne)
  await prisma.$executeRawUnsafe(`
      SELECT setval(
                     pg_get_serial_sequence('"User"', 'id'),
                     COALESCE((SELECT MAX("id") FROM "User"), 0)
             )
  `);

  // owner z rolą RESTAURANT_OWNER — UPDATE też podmieni hasło na argon2
  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: { password: hashed, roles: { set: ['RESTAURANT_OWNER'] } },
    create: {
      email: 'owner@example.com',
      password: hashed,
      roles: ['RESTAURANT_OWNER'],
    },
  });
  console.log('Owner id:', owner.id, 'roles:', owner.roles);

  // backfill ownerId tylko dla NULL (zadziała nawet gdy kolumna jest NOT NULL → wtedy 0)
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "Restaurant" SET "ownerId" = $1 WHERE "ownerId" IS NULL`,
    owner.id,
  );
  console.log('Updated rows (backfill):', updated);

  const [{ count: nullAfter }] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "Restaurant" WHERE "ownerId" IS NULL`,
  );
  console.log(`Without ownerId after: ${nullAfter}`);
}

main()
  .catch((e) => {
    console.error('SEED ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
