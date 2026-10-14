const { AppError } = require('../../platform/errors');

/** A step the job cannot take right now (wrong state, nothing to act on). `code` is what the chat and dashboard read. */
class WorkflowError extends AppError {
  constructor(message, code = 'INVALID_TRANSITION') {
    super(message, { code, status: 409, expose: true });
  }
}

module.exports = { WorkflowError };
