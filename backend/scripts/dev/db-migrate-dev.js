/**
 * Creates a new Prisma migration file from schema.prisma without applying it to anything but
 * the shadow database. Refuses to run unless DATABASE_URL points at this machine, because
 * `prisma migrate dev` can reset a database.
 *
 * Usage: DATABASE_URL=postgresql://fleetlink:fleetlink@localhost:5433/fleetlink_dev npm run db:migrate:dev -- --name add_thing
 */
const { spawnSync } = require('child_process');

const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
  console.error('Refusing to run: set DATABASE_URL to the local development database (localhost or 127.0.0.1).');
  process.exit(1);
}

const prisma = require.resolve('prisma/build/index.js');
const extra = process.argv.slice(2);
const run = spawnSync(process.execPath, [prisma, 'migrate', 'dev', '--create-only', ...extra], { stdio: 'inherit', env: process.env });
process.exit(run.status ?? 1);
