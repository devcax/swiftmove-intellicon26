const crypto = require('crypto');

const VALID_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** Reuses a well-formed x-request-id from the caller, otherwise makes a UUID. */
function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && VALID_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}

module.exports = { requestId };
