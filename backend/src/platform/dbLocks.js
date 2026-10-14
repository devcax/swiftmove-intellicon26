const { Prisma } = require('@prisma/client');

/**
 * One fixed statement per lockable table. Tables without their own organization_id belong to an
 * organization through their job, so the lock joins jobs. Identifiers are never built from input.
 */
const LOCK_STATEMENTS = {
  drivers: (id, org) => Prisma.sql`SELECT id FROM drivers WHERE id = ${id}::uuid AND organization_id = ${org}::uuid FOR UPDATE`,
  conversations: (id, org) => Prisma.sql`SELECT id FROM conversations WHERE id = ${id}::uuid AND organization_id = ${org}::uuid FOR UPDATE`,
  jobs: (id, org) => Prisma.sql`SELECT id FROM jobs WHERE id = ${id}::uuid AND organization_id = ${org}::uuid FOR UPDATE`,
  job_assignments: (id, org) => Prisma.sql`SELECT t.id FROM job_assignments t JOIN jobs j ON j.id = t.job_id WHERE t.id = ${id}::uuid AND j.organization_id = ${org}::uuid FOR UPDATE OF t`,
  job_requests: (id, org) => Prisma.sql`SELECT t.id FROM job_requests t JOIN jobs j ON j.id = t.job_id WHERE t.id = ${id}::uuid AND j.organization_id = ${org}::uuid FOR UPDATE OF t`,
  incidents: (id, org) => Prisma.sql`SELECT t.id FROM incidents t JOIN jobs j ON j.id = t.job_id WHERE t.id = ${id}::uuid AND j.organization_id = ${org}::uuid FOR UPDATE OF t`,
  policy_definitions: (id, org) => Prisma.sql`SELECT id FROM policy_definitions WHERE id = ${id}::uuid AND organization_id = ${org}::uuid FOR UPDATE`,
  flow_definitions: (id, org) => Prisma.sql`SELECT id FROM flow_definitions WHERE id = ${id}::uuid AND organization_id = ${org}::uuid FOR UPDATE`,
};

const LOCKABLE_TABLES = Object.freeze(Object.keys(LOCK_STATEMENTS));

/**
 * Lock one row for the rest of the transaction. Lock order everywhere: driver, job, assignment.
 * Returns true when the row exists in that organization. Prisma has no FOR UPDATE call, hence raw SQL.
 */
async function lockRow(tx, table, id, organizationId) {
  const statement = Object.hasOwn(LOCK_STATEMENTS, table) ? LOCK_STATEMENTS[table] : undefined;
  if (!statement) throw new Error(`lockRow: "${table}" is not a lockable table`);
  const rows = await tx.$queryRaw(statement(id, organizationId));
  return rows.length > 0;
}

/** Serialize work on a named thing (one flow, say) for the rest of the transaction. Waits its turn. */
async function lockByName(tx, name) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${name}))`;
}

/** Take the named lock only if nobody holds it. True when this transaction got it. */
async function tryLockByName(tx, name) {
  const [{ locked }] = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtext(${name})) AS locked`;
  return locked;
}

module.exports = { lockRow, lockByName, tryLockByName, LOCKABLE_TABLES };
