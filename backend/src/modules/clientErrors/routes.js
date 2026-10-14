const express = require('express');
const { ipKeyGenerator } = require('express-rate-limit');
const { clientErrorSchema } = require('./schemas');
const { buildLimiter } = require('../../platform/http/rateLimit');
const { logger } = require('../../platform/logger');

const MINUTE = 60_000;
const LIMIT_PER_MINUTE = 10;

/**
 * POST /api/client-errors: the dashboard reports a screen that crashed. It is only logged (at error, with the
 * user and request id) so someone can find it. Nothing here touches business data.
 */
function createClientErrorsRouter({ log = logger, limit = LIMIT_PER_MINUTE } = {}) {
  const router = express.Router();
  const limiter = buildLimiter({
    name: 'client-errors', windowMs: MINUTE, limit, log,
    // The IPv6-safe helper, so one person cannot dodge the limit by rotating addresses in their /64.
    keyGenerator: (req) => (req.actor?.userId ? `user:${req.actor.userId}` : `ip:${ipKeyGenerator(req.ip)}`),
  });

  router.post('/', limiter, (req, res) => {
    const { message, path, digest } = clientErrorSchema.parse(req.body);
    log.error({
      clientError: { message, path, digest },
      userId: req.actor?.userId, organizationId: req.actor?.organizationId, requestId: req.id,
    }, 'client error');
    res.status(202).json({ ok: true });
  });

  return router;
}

module.exports = { createClientErrorsRouter, LIMIT_PER_MINUTE };
