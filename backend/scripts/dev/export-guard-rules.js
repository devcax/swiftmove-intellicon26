/**
 * Prints the old guard_rules table as JSON, so it can be kept before the migration that drops it.
 *
 * Usage: npm run db:export-guard-rules > guard_rules.json
 */
require('dotenv').config();
const { prisma } = require('../../src/platform/db');

prisma.$queryRaw`SELECT * FROM guard_rules ORDER BY organization_id, code`
  .then((rows) => console.log(JSON.stringify(rows, null, 2)))
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
