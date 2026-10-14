/**
 * Event dispatcher: delivers committed events to their subscribers.
 *
 * AT-LEAST-ONCE: a handler can run twice for the same event (a crash after the handler finished but
 * before the delivery was marked DONE, or a lease that expired while a slow handler was still running).
 * Every handler must be safe to run twice. Use the event id as a dedupe key wherever a message is sent.
 *
 * Claiming: one statement picks due deliveries with FOR UPDATE SKIP LOCKED and pushes their
 * next_attempt_at forward by a lease. Only deliveries for subscribers registered in THIS process are
 * claimed, so an instance that does not know a subscriber (a rolling deploy, a disabled plugin) leaves
 * its deliveries for one that does, so another loop (or another instance) skips them while the
 * handler runs outside any transaction. Success marks DONE. Failure schedules a retry with backoff
 * and jitter, and after the last attempt marks FAILED.
 */
const { Prisma } = require('@prisma/client');
const { prisma } = require('./db');
const events = require('./events');
const defaultRunner = require('./runner');
const { logger } = require('./logger');

const BATCH_SIZE = 20;
const CONCURRENCY = 4;
const FALLBACK_INTERVAL_MS = 2000;
const LEASE_SECONDS = 60;
const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const MAX_ERROR_CHARS = 500;

/** 2^attempts seconds, at most 5 minutes, with jitter so retries from one outage do not line up. */
function defaultBackoff(attempts, random = Math.random) {
  const base = Math.min(MAX_BACKOFF_MS, 2 ** attempts * 1000);
  return Math.floor(base * (0.5 + random() * 0.5));
}

const errorText = (err) => String(err?.message ?? err).slice(0, MAX_ERROR_CHARS);

function createDispatcher({
  db = prisma, runner = defaultRunner, log = logger, batchSize = BATCH_SIZE, intervalMs = FALLBACK_INTERVAL_MS,
  leaseSeconds = LEASE_SECONDS, maxAttempts = MAX_ATTEMPTS, backoff = defaultBackoff,
} = {}) {
  let timer = null;
  let unsubscribe = null;
  let inFlight = null;
  let again = false;
  let stopped = true;

  // Prisma has no SKIP LOCKED call, hence raw SQL. The lease keeps a claimed row away from other loops.
  const claim = async () => {
    const names = events.registeredSubscriberNames();
    if (names.length === 0) return [];
    return db.$queryRaw(Prisma.sql`
    WITH due AS (
      SELECT id FROM event_deliveries
       WHERE status = 'PENDING' AND next_attempt_at <= now() AND subscriber = ANY(${names}::text[])
       ORDER BY next_attempt_at, id
       LIMIT ${batchSize}
       FOR UPDATE SKIP LOCKED
    )
    UPDATE event_deliveries d
       SET next_attempt_at = now() + (${leaseSeconds} * interval '1 second')
      FROM due
     WHERE d.id = due.id
    RETURNING d.id, d.event_id, d.subscriber, d.attempts`);
  };

  const systemActor = (organizationId) => ({ type: 'SYSTEM', organizationId, source: 'EVENT' });
  const systemRun = (organizationId) => (name, input, options) => runner.run(name, input, systemActor(organizationId), options);
  // A plugin may read through queries. It never touches a module's tables.
  const systemQuery = (organizationId) => (name, input) => runner.runQuery(name, input, systemActor(organizationId));

  async function finish(delivery, error) {
    const attempts = delivery.attempts + 1;
    if (!error) {
      await db.eventDelivery.update({ where: { id: delivery.id }, data: { status: 'DONE', attempts, lastError: null } });
      return;
    }
    const failed = attempts >= maxAttempts;
    // The retry time is computed by the database, the same clock the claim compares against: the app and
    // the database clocks are not guaranteed to agree.
    await db.$executeRaw(Prisma.sql`
      UPDATE event_deliveries
         SET status = ${failed ? 'FAILED' : 'PENDING'}, attempts = ${attempts}, last_error = ${errorText(error)},
             next_attempt_at = now() + (${backoff(attempts)} * interval '1 millisecond')
       WHERE id = ${delivery.id}::uuid`);
    const fields = { eventId: delivery.event_id, subscriber: delivery.subscriber, attempts, err: error };
    if (failed) log.error(fields, 'event delivery failed for good');
    else log.warn({ ...fields, err: undefined, error: errorText(error) }, 'event delivery failed, will retry');
  }

  async function deliver(delivery) {
    try {
      const event = await db.event.findUnique({ where: { id: delivery.event_id } });
      const handler = event && events.subscriberHandler(event.type, delivery.subscriber);
      if (!handler) throw new Error(`no subscriber "${delivery.subscriber}" is registered for this event`);
      await handler({ event, run: systemRun(event.organizationId), query: systemQuery(event.organizationId) });
      await finish(delivery, null);
    } catch (err) {
      await finish(delivery, err);
    }
  }

  /** Deliver everything that is due, batch after batch. One failing delivery never stops the others. */
  async function drain() {
    for (;;) {
      const batch = await claim();
      if (batch.length === 0) return;
      // A few at a time: every handler takes a database connection, and the web requests share the same pool.
      for (let i = 0; i < batch.length; i += CONCURRENCY) await Promise.all(batch.slice(i, i + CONCURRENCY).map(deliver));
    }
  }

  /** One pass. A request that arrives while a pass is running makes it run once more, never in parallel. */
  function tick() {
    if (inFlight) {
      again = true;
      return inFlight;
    }
    inFlight = (async () => {
      do {
        again = false;
        try {
          await drain();
        } catch (err) {
          log.error({ err }, 'event dispatcher pass failed');
        }
      } while (again && !stopped);
    })().finally(() => { inFlight = null; });
    return inFlight;
  }

  function start() {
    if (!stopped) return;
    stopped = false;
    unsubscribe = events.onNewEvents(() => { tick(); });
    timer = setInterval(() => { tick(); }, intervalMs);
    timer.unref();
    tick();
  }

  /** Stop taking new work and wait for the running pass to finish. */
  async function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    if (inFlight) await inFlight;
  }

  return { start, stop, tick };
}

module.exports = { createDispatcher, defaultBackoff, MAX_ATTEMPTS };
