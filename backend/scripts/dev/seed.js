/**
 * Seeds the built-in policies and conversation flows. Safe to run any number of times: both seeders only insert what is missing
 * and never overwrite manager edits.
 *
 * Usage: npm run db:seed   (reads DATABASE_URL from backend/.env)
 */
require('dotenv').config();
const { prisma } = require('../../src/platform/db');
const { seedPolicies } = require('./seed-policies');
const { seedFlows } = require('./seed-flows');

async function seed() {
  console.log('Seeding built-in policies and conversation flows ...');
  await prisma.$transaction(async (tx) => {
    await seedPolicies(tx);
    await seedFlows(tx);
  }, { timeout: 60_000 });
}

module.exports = { seed };

if (require.main === module) {
  seed()
    .catch((err) => { console.error(`Built-in seeding failed: ${err.message}`); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
