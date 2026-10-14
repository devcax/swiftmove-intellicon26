const { NotFoundError } = require('../errors');

/** Unknown /api paths get the same error body as every other failure. */
function notFound(req, _res, next) {
  next(new NotFoundError('That endpoint does not exist.'));
}

module.exports = { notFound };
