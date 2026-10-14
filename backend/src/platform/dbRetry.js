const { logger } = require('./logger');

// Prisma error codes that mean "try again": cannot reach, timed out, pool timeout, deadlock.
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P2024', 'P2034']);
// Postgres codes that mean the same: serialization failure, deadlock, shutdown, not accepting.
const TRANSIENT_DB_CODES = new Set(['40001', '40P01', '57P01', '57P03']);
// The server closed the connection. A read can be repeated; a transaction may or may not have committed.
const CONNECTION_CLOSED = 'P1017';

function databaseCodeOf(err) {
  // A failed raw query reports the database code in meta.code; a driver error carries it directly.
  return err?.meta?.code ?? (typeof err?.code === 'string' && !err.code.startsWith('P') ? err.code : undefined);
}

/** True only for failures that are safe to repeat. Never unique, foreign-key, not-found or validation errors. */
function isTransient(err, { inTransaction = false } = {}) {
  const prismaCodes = [err?.code, err?.errorCode].filter(Boolean);
  if (prismaCodes.some((code) => TRANSIENT_PRISMA_CODES.has(code))) return true;
  if (prismaCodes.includes(CONNECTION_CLOSED)) return !inTransaction;
  const dbCode = databaseCodeOf(err);
  return Boolean(dbCode) && (TRANSIENT_DB_CODES.has(dbCode) || dbCode.startsWith('08'));
}

const defaultSleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** Wait between 0 and min(maxMs, baseMs * 2^attempt): exponential backoff with full jitter. */
function backoffMs(attempt, { baseMs, maxMs }, random) {
  return Math.floor(random() * Math.min(maxMs, baseMs * 2 ** attempt));
}

/**
 * Run `fn`, repeating it after a transient failure. `fn` must be safe to repeat. At most `retries`
 * repeats, then the last error is thrown. Pass `inTransaction: true` when `fn` is a whole transaction.
 */
async function withRetry(fn, options = {}) {
  const {
    retries = 4, baseMs = 100, maxMs = 2000, inTransaction = false,
    sleep = defaultSleep, random = Math.random, log = logger,
  } = options;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isTransient(err, { inTransaction })) throw err;
      const waitMs = backoffMs(attempt, { baseMs, maxMs }, random);
      log.warn({ attempt: attempt + 1, code: err.code ?? err.errorCode ?? databaseCodeOf(err), waitMs }, 'database retry');
      await sleep(waitMs);
    }
  }
}

module.exports = { isTransient, withRetry, backoffMs };
