/**
 * Errors are values with a code. `expose: true` means message and details are safe to show a
 * client. Anything else is replaced by a generic message at the HTTP edge.
 */
class AppError extends Error {
  // `extra` is more fields for the response body (an old client may read `errors` or `hint`); sent only when expose is true.
  constructor(message, { code = 'INTERNAL', status = 500, details, expose = false, cause, extra } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.expose = expose;
    this.extra = extra;
  }
}

const define = (name, defaults) => ({
  [name]: class extends AppError {
    constructor(message, options = {}) {
      super(message, { ...defaults, ...options });
    }
  },
})[name];

const ValidationError = define('ValidationError', { code: 'VALIDATION_FAILED', status: 400, expose: true });
const AuthenticationError = define('AuthenticationError', { code: 'UNAUTHENTICATED', status: 401, expose: true });
const AuthorizationError = define('AuthorizationError', { code: 'FORBIDDEN', status: 403, expose: true });
const NotFoundError = define('NotFoundError', { code: 'NOT_FOUND', status: 404, expose: true });
const ConflictError = define('ConflictError', { code: 'CONFLICT', status: 409, expose: true });
const PolicyBlockedError = define('PolicyBlockedError', { code: 'POLICY_BLOCKED', status: 422, expose: true });
const RateLimitError = define('RateLimitError', { code: 'RATE_LIMITED', status: 429, expose: true });
const ExternalServiceError = define('ExternalServiceError', { code: 'EXTERNAL_SERVICE_FAILED', status: 502, expose: false });

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  PolicyBlockedError,
  RateLimitError,
  ExternalServiceError,
};
