const { logger, flushLogs } = require('./logger');

const DRAIN_LIMIT_MS = 10_000;

/**
 * Stop accepting requests, wait for in-flight ones (up to the limit), run the cleanups
 * (disconnect databases, stop timers), flush logs, then call `exit`.
 */
async function shutdown({ server, cleanups = [], limitMs = DRAIN_LIMIT_MS, exit = process.exit, reason }) {
  logger.info({ reason }, 'shutting down');
  const drained = new Promise((resolve) => (server ? server.close(() => resolve()) : resolve()));
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(resolve, limitMs); });
  await Promise.race([drained, timeout]);
  clearTimeout(timer);
  for (const cleanup of cleanups) {
    try {
      await cleanup();
    } catch (err) {
      logger.error({ err }, 'cleanup failed during shutdown');
    }
  }
  await flushLogs();
  exit(0);
}

async function crash(kind, err, exit) {
  logger.fatal({ err, kind }, 'process crashed');
  await flushLogs();
  exit(1);
}

/** Register crash and shutdown handlers once, at process start. */
function registerProcessHandlers({ server, cleanups, exit = process.exit }) {
  process.on('unhandledRejection', (err) => crash('unhandledRejection', err, exit));
  process.on('uncaughtException', (err) => crash('uncaughtException', err, exit));
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => shutdown({ server, cleanups, exit, reason: signal }));
  }
}

module.exports = { registerProcessHandlers, shutdown };
