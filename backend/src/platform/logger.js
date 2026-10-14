const pino = require('pino');
const config = require('./config');

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.apiKey',
  '*.secret',
];

function productionTransport() {
  return pino.transport({
    targets: [
      { target: '@axiomhq/pino', level: config.logLevel, options: { dataset: config.axiomDataset, token: config.axiomApiKey } },
      { target: 'pino/file', level: config.logLevel, options: { destination: 1 } },
    ],
  });
}

/** Build a logger. `destination` is for tests; real use goes through the exported `logger`. */
function createLogger({ level, destination, transport } = {}) {
  return pino({ level, redact: { paths: REDACT_PATHS, censor: '[Redacted]' } }, destination ?? transport);
}

const transport = config.isProduction ? productionTransport() : undefined;
const level = config.nodeEnv === 'test' ? 'silent' : config.logLevel;
const logger = createLogger({ level, transport });

/** Resolves when pending logs have been handed over (or after 3 seconds at most). */
function flushLogs() {
  const flushed = new Promise((resolve) => logger.flush(() => resolve()));
  const closed = transport
    ? new Promise((resolve) => { transport.once('close', resolve); transport.end(); })
    : Promise.resolve();
  const timeout = new Promise((resolve) => { setTimeout(resolve, 3000).unref(); });
  return Promise.race([Promise.all([flushed, closed]), timeout]);
}

module.exports = { logger, createLogger, flushLogs, REDACT_PATHS };
