const helmet = require('helmet');
const cors = require('cors');
const { AppError, AuthorizationError } = require('../errors');

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const WEBHOOK_PREFIX = '/api/webhooks/whatsapp';
// The one route whose body is a file (JPEG, PNG or PDF) instead of JSON.
const UPLOAD_PATH = '/api/evidence/upload';

const isWebhook = (req) => req.path.startsWith(WEBHOOK_PREFIX);
const hasBody = (req) => Number(req.headers['content-length']) > 0 || Boolean(req.headers['transfer-encoding']);

/** helmet, CORS from an allowlist (none = no CORS headers), no x-powered-by, one trusted proxy hop. */
function applySecurity(app, { corsOrigins }) {
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(helmet());
  app.use(cors({
    // Never reflect an arbitrary Origin: only exact matches from the allowlist get headers.
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Request-Id'],
  }));
}

/** State-changing requests that carry a body must be JSON (the WhatsApp webhook is exempt). */
function requireJson(req, _res, next) {
  if (!STATE_CHANGING.has(req.method) || isWebhook(req) || req.path === UPLOAD_PATH || !hasBody(req) || req.is('application/json')) return next();
  return next(new AppError('Send the request body as JSON.', { code: 'UNSUPPORTED_MEDIA_TYPE', status: 415, expose: true }));
}

/** An Origin header on a state-changing request must be this app's own origin or allowlisted. */
function originCheck({ corsOrigins }) {
  return function checkOrigin(req, _res, next) {
    const origin = req.headers.origin;
    if (!origin || !STATE_CHANGING.has(req.method) || isWebhook(req)) return next();
    let host;
    try {
      host = new URL(origin).host;
    } catch {
      return next(new AuthorizationError('This request origin is not allowed.'));
    }
    if (host === req.host || corsOrigins.includes(origin)) return next();
    return next(new AuthorizationError('This request origin is not allowed.'));
  };
}

module.exports = { applySecurity, requireJson, originCheck };
