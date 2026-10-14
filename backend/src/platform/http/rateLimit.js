/**
 * Rate limiters. The memory store is correct for ONE backend instance only: with more than one
 * instance each keeps its own counters and the real limit multiplies. A shared store (Redis or
 * Postgres) is required before running more than one instance.
 */
const crypto = require('crypto');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const config = require('../config');
const { logger } = require('../logger');
const { RateLimitError } = require('../errors');

const MINUTE = 60_000;
const WEBHOOK_PREFIX = '/api/webhooks/whatsapp';

const byIp = (req) => ipKeyGenerator(req.ip);
/** Identity when known (set by authenticate), otherwise the client address. */
const byUserOrIp = (req) => (req.actor?.userId ? `user:${req.actor.userId}` : `ip:${byIp(req)}`);
const emailOf = (req) => String(req.body?.email ?? '').trim().toLowerCase();
const byEmail = (req) => `email:${emailOf(req) || 'none'}`;
// The email is personal data: log only a short hash of it.
const loggable = (key) => (key.startsWith('email:') ? `email:${crypto.createHash('sha256').update(key).digest('hex').slice(0, 10)}` : key);

function buildLimiter({ name, windowMs, limit, keyGenerator, skip, log = logger }) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator,
    skip,
    standardHeaders: 'draft-6', // RateLimit-Limit / -Remaining / -Reset, plus Retry-After when blocked
    legacyHeaders: false, // no X-RateLimit-*
    handler: (req, res, next, options) => {
      const key = keyGenerator(req);
      log.warn({ limiter: name, key: loggable(key), requestId: req.id }, 'rate limit hit');
      const retryAfter = Math.ceil(options.windowMs / 1000);
      res.setHeader('Retry-After', String(res.getHeader('Retry-After') ?? retryAfter));
      next(new RateLimitError('Too many requests. Please wait a moment and try again.'));
    },
  });
}

const isWebhook = (req) => req.path.startsWith(WEBHOOK_PREFIX);
const loginWindowMs = config.rateLimitLoginWindowMin * MINUTE;

const apiLimiter = buildLimiter({
  name: 'api', windowMs: MINUTE, limit: config.rateLimitApiPerMin, keyGenerator: byUserOrIp, skip: isWebhook,
});
const loginIpLimiter = buildLimiter({
  name: 'login-ip', windowMs: loginWindowMs, limit: config.rateLimitLoginMax, keyGenerator: (req) => `ip:${byIp(req)}`,
});
const loginEmailLimiter = buildLimiter({
  name: 'login-email', windowMs: loginWindowMs, limit: config.rateLimitLoginMax, keyGenerator: byEmail,
});
const aiLimiter = buildLimiter({ name: 'ai', windowMs: MINUTE, limit: config.rateLimitAiPerMin, keyGenerator: byUserOrIp });
const writeLimiter = buildLimiter({ name: 'write', windowMs: MINUTE, limit: config.rateLimitWritePerMin, keyGenerator: byUserOrIp });
const webhookLimiter = buildLimiter({
  name: 'webhook', windowMs: MINUTE, limit: config.rateLimitWebhookPerMin, keyGenerator: (req) => `ip:${byIp(req)}`,
});

/** POST /api/auth/login: both the address and the email are limited. */
const loginLimiter = [loginIpLimiter, loginEmailLimiter];

module.exports = { buildLimiter, apiLimiter, loginLimiter, aiLimiter, writeLimiter, webhookLimiter };
