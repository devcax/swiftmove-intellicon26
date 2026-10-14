/**
 * Drops and recreates the test database, applies every Prisma migration, then seeds it.
 * Refuses to run unless the database name ends with _test.
 *
 * Usage: npm run test:db:reset   (reads DATABASE_URL_TEST from backend/.env)
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function parseTestUrl(raw) {
  if (!raw) throw new Error('DATABASE_URL_TEST is not set. Add it to backend/.env');
  const url = new URL(raw);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!/^[a-z0-9_]+_test$/.test(name)) throw new Error(`Refusing to reset "${name}": the database name must end with _test`);
  if (raw === process.env.DATABASE_URL) throw new Error('Refusing to reset: DATABASE_URL_TEST equals DATABASE_URL');
  return { name, maintenanceUrl: Object.assign(new URL(raw), { pathname: '/postgres' }).toString() };
}

/** A child process that sees the test database as DATABASE_URL, so nothing it runs can reach the .env database. */
function runWithTestDatabase(args) {
  const run = spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST } });
  if (run.status !== 0) throw new Error(`${path.basename(args[0])} failed`);
}

async function main() {
  const { name, maintenanceUrl } = parseTestUrl(process.env.DATABASE_URL_TEST);
  const admin = new PrismaClient({ datasources: { db: { url: maintenanceUrl } } });
  try {
    // name is validated above to [a-z0-9_]+_test, so quoting it is safe
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.$disconnect();
  }
  console.log(`Recreated ${name}.`);
  runWithTestDatabase([require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
  runWithTestDatabase([path.join(__dirname, 'seed.js')]);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
