const pinoHttp = require('pino-http');
const { logger } = require('../logger');

/** One log line per request: method, path, status, duration, ids. Never headers or bodies. */
const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id,
  serializers: {
    req: (req) => ({ method: req.method, path: String(req.url).split('?')[0] }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  customProps: (req) => ({
    requestId: req.id,
    userId: req.actor?.userId,
    organizationId: req.actor?.organizationId,
  }),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    return res.statusCode >= 400 ? 'warn' : 'info';
  },
  customSuccessMessage: () => 'request completed',
  customErrorMessage: () => 'request failed',
});

module.exports = { requestLogger };
