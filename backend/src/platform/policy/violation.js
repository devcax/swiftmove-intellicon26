/**
 * What the WhatsApp side receives when a policy blocks a step: an error shaped like the old refusals (a message and a `code` the
 * bot switches on) that also carries the full finding, so the bot can turn a block into a conversation or a question for the driver.
 */
const { AppError } = require('../errors');

class PolicyViolationError extends AppError {
  constructor(failure, failures) {
    super(failure?.message ?? 'This action is not allowed by an operational policy.', {
      code: failure?.code ?? 'POLICY_BLOCKED', status: 409, expose: true,
    });
    this.name = 'PolicyViolationError';
    this.isPolicyViolation = true;
    this.failure = failure ?? null;
    this.failures = failures ?? [];
  }
}

/** What should happen next after a block: which evidence, which conversation. */
function recommendedNextStep(failure) {
  if (!failure) return null;
  return {
    policyKey: failure.policyKey ?? null,
    policyName: failure.policyName ?? null,
    blockMode: failure.blockMode ?? 'BLOCK',
    flowKey: failure.onBlock?.flowKey ?? null,
    evidence: failure.evidence ?? null,
    message: failure.onBlock?.message ?? failure.message,
    reason: failure.reason ?? null,
  };
}

module.exports = { PolicyViolationError, recommendedNextStep };
