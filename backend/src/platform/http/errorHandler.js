const { ZodError } = require('zod');
const { AppError } = require('../errors');
const { logger } = require('../logger');

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

// Errors raised by the body parser carry a `type`; map the ones a client can cause.
const BODY_PARSER_ERRORS = {
  'entity.too.large': { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' },
  'entity.parse.failed': { status: 400, code: 'BAD_REQUEST', message: 'The request body is not valid JSON.' },
  'encoding.unsupported': { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported content encoding.' },
};

function describe(err) {
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    return { status: 400, body: { error: 'The request is not valid.', code: 'VALIDATION_FAILED', details }, level: 'warn' };
  }
  if (err instanceof AppError && err.expose) {
    const body = { error: err.message, code: err.code, ...(err.extra ?? {}) };
    if (err.details !== undefined) body.details = err.details;
    return { status: err.status, body, level: 'warn' };
  }
  const parser = BODY_PARSER_ERRORS[err?.type];
  if (parser) return { status: parser.status, body: { error: parser.message, code: parser.code }, level: 'warn' };
  const status = err instanceof AppError ? err.status : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL';
  return { status, body: { error: GENERIC_MESSAGE, code }, level: 'error' };
}

/** The last Express middleware. Never puts a stack, SQL or an unknown error's message in a response. */
function createErrorHandler(log = logger) {
  // Express recognises an error handler by its four parameters.
  return function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);
    const { status, body, level } = describe(err);
    body.requestId = req.id;
    log[level]({
      err,
      requestId: req.id,
      route: `${req.method} ${String(req.originalUrl ?? req.url).split('?')[0]}`,
      code: body.code,
      status,
      userId: req.actor?.userId,
      organizationId: req.actor?.organizationId,
    }, level === 'error' ? 'request failed' : 'request rejected');
    return res.status(status).json(body);
  };
}

module.exports = { createErrorHandler, errorHandler: createErrorHandler() };
