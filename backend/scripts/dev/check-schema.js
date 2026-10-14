/**
 * Quick schema verification: lists the tables and counts the seeded roles and organizations.
 *
 * Usage: npm run db:check
 */
require('dotenv').config();
const { prisma } = require('../../src/platform/db');

async function main() {
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log(`Tables (${tables.length}):`);
  tables.forEach((row) => console.log(' -', row.tablename));
  console.log('Roles seeded:', await prisma.role.count());
  console.log('Organizations seeded:', await prisma.organization.count());
}

main()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
