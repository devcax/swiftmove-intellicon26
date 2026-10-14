const { ValidationError } = require('../../platform/errors');
const { validatePolicy, validatePolicyMeta } = require('../../platform/policy/dsl');

/** Turn validator errors ({ field, message }) into the error body the dashboard reads: `error` plus an `errors` list. */
function validationFailure(errors, extra = {}, status = 400) {
  return new ValidationError(errors[0]?.message ?? 'Invalid policy.', {
    status,
    details: errors.map((e) => ({ path: e.field, message: e.message })),
    extra: { errors, ...extra },
  });
}

/** Authoritative validation of a stored or draft policy payload: the metadata and the rule. */
function checkPayload(payload) {
  const meta = validatePolicyMeta({ key: payload.key, name: payload.name, description: payload.description });
  const policy = validatePolicy({
    action: payload.action, enforcement: payload.enforcement, match: payload.match, rule: payload.rule, onBlock: payload.onBlock,
  });
  return { ok: meta.ok && policy.ok, errors: [...meta.errors, ...policy.errors] };
}

function assertValidPayload(payload, extra) {
  const check = checkPayload(payload);
  if (!check.ok) throw validationFailure(check.errors, extra);
}

module.exports = { validationFailure, checkPayload, assertValidPayload };
