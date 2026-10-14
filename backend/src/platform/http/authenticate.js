const { AuthenticationError, AuthorizationError } = require('../errors');
const { SESSION_TTL_MS, sessionTokenOf } = require('./cookies');

const TOUCH_INTERVAL_MS = 60_000;

/**
 * Builds the middleware that turns a session cookie into `req.actor`. The session store is passed
 * in, so the platform stays free of any module. An invalid or missing session is a 401.
 */
function createAuthenticate({ findSession, touchSession, now = Date.now }) {
  return async function authenticate(req, _res, next) {
    const token = sessionTokenOf(req);
    if (!token) return next(new AuthenticationError('Please sign in.'));
    const session = await findSession(token);
    if (!session) return next(new AuthenticationError('Your session has expired. Please sign in again.'));
    // Sliding expiry, written at most once a minute per session.
    if (now() - session.lastSeenAt.getTime() >= TOUCH_INTERVAL_MS) await touchSession(session.id, SESSION_TTL_MS);
    req.actor = {
      type: 'MANAGER', userId: session.userId, organizationId: session.organizationId, roles: session.roles,
      source: 'GUI', sessionId: session.id, name: session.name, email: session.email,
    };
    return next();
  };
}

/** Allow the request only when the actor holds one of the roles. Mount after authenticate. */
function requireRole(...roles) {
  return function checkRole(req, _res, next) {
    const held = req.actor?.roles ?? [];
    if (roles.some((role) => held.includes(role))) return next();
    return next(new AuthorizationError('You do not have permission to do that.'));
  };
}

module.exports = { createAuthenticate, requireRole, TOUCH_INTERVAL_MS };
