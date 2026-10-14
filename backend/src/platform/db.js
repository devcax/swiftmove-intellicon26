/**
 * The one database module. Exports a single Prisma client for the whole process, retrying
 * transactions, row locks and health. Never create a second PrismaClient.
 *
 * Old code that still uses the `pg` pool lives in src/db.js until its module moves.
 */
const { PrismaClient } = require('@prisma/client');
const config = require('./config');
const { logger } = require('./logger');
const { withRetry, isTransient } = require('./dbRetry');
const { lockRow, lockByName, tryLockByName, LOCKABLE_TABLES } = require('./dbLocks');

const SLOW_QUERY_MS = 500;

const base = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
  log: [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }],
});
base.$on('warn', (event) => logger.warn({ target: event.target }, event.message));
base.$on('error', (event) => logger.error({ target: event.target }, event.message));

/** Log queries slower than 500 ms with model and operation, never with parameter values. */
const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const started = Date.now();
        try {
          return await query(args);
        } finally {
          const ms = Date.now() - started;
          if (ms > SLOW_QUERY_MS) logger.warn({ model, operation, ms }, 'slow query');
        }
      },
    },
  },
});

/**
 * Run `fn(tx)` in one transaction, repeating the whole function after a deadlock or write conflict.
 *
 * `fn` must NOT send WhatsApp messages or call an LLM (it can run more than once and holds locks),
 * must use only `tx`, never the global `prisma`, and must not call withTransaction again.
 */
function withTransaction(fn, { isolationLevel } = {}) {
  const options = { maxWait: config.dbTransactionMaxWaitMs, timeout: config.dbTransactionTimeoutMs };
  if (isolationLevel) options.isolationLevel = isolationLevel;
  return withRetry(() => prisma.$transaction(fn, options), { inTransaction: true });
}

/** True when the database answers. Never exposes the driver's error message. */
async function isHealthy() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, 'database health check failed');
    return false;
  }
}

const disconnect = () => base.$disconnect();

/**
 * Run `work` only if nobody else holds the named lock, in a transaction that keeps the lock until it ends (so another process skips the
 * same work meanwhile). Returns true when it ran. `db` is for tests.
 */
function runExclusively(name, work, { db = prisma, timeout = 10 * 60 * 1000 } = {}) {
  return db.$transaction(async (tx) => {
    if (!(await tryLockByName(tx, name))) return false;
    await work();
    return true;
  }, { timeout, maxWait: 5000 });
}

module.exports = { prisma, runExclusively, withTransaction, withRetry, isTransient, lockRow, lockByName, tryLockByName, LOCKABLE_TABLES, isHealthy, disconnect };
