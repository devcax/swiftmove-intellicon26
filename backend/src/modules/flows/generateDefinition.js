const { AppError, ValidationError } = require('../../platform/errors');
const { draftFlow } = require('./author');
const { ACTION_NAMES, ACTION_LABELS, PROMPT_PROVIDER_NAMES, PROMPT_PROVIDER_LABELS } = require('./vocabulary');
const { validateFlow } = require('./flowValidate');
const { VALIDATE_KNOWN, flowInvalid } = require('./load');

const catalog = (names, labels) => names.map((n) => `- ${n} — ${labels[n] ?? n}`).join('\n');

/**
 * Ask the AI author for a flow definition from plain words, and check it against the step vocabulary. Slow (a model call), so callers
 * run it in an action's `prepare`, before any transaction opens. Throws what the dashboard and the assistant show.
 */
async function generateDefinition({ description, base = null, organizationId, draft = draftFlow }) {
  const text = String(description ?? '').trim();
  if (text.length < 10 || text.length > 2000) throw new ValidationError('Describe the conversation (or the change) in 10-2000 characters.');
  if (base !== null) {
    const check = validateFlow(base, VALIDATE_KNOWN);
    if (!check.ok) throw flowInvalid(check.errors, 'The current definition has validation problems — fix them in the editor first.');
  }
  let result;
  try {
    result = await draft({
      description: text, base, organizationId,
      catalogs: { actions: catalog(ACTION_NAMES, ACTION_LABELS), promptProviders: catalog(PROMPT_PROVIDER_NAMES, PROMPT_PROVIDER_LABELS) },
      validate: (def) => validateFlow(def, VALIDATE_KNOWN),
    });
  } catch (cause) {
    throw new AppError('The AI author is unavailable right now — try again in a moment.', { code: 'EXTERNAL_SERVICE_FAILED', status: 502, expose: true, cause });
  }
  if (!result.ok) {
    throw flowInvalid(result.issues.map((message) => ({ step: null, message })), 'The AI draft did not pass validation — try rephrasing the description.', 422);
  }
  return result;
}

module.exports = { generateDefinition };
