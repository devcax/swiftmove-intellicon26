const { clashMessage } = require('./triggers');
const { ValidationError, NotFoundError, ConflictError } = require('../../platform/errors');
const { lockByName } = require('../../platform/db');
const { validateFlow } = require('./flowValidate');
const { ACTION_NAMES, PROMPT_PROVIDER_NAMES } = require('./vocabulary');
const store = require('./store');
const repo = require('./repo');

const VALIDATE_KNOWN = { actions: ACTION_NAMES, promptProviders: PROMPT_PROVIDER_NAMES };

/** Serialize changes to one flow (and so its versions and trigger checks) for the length of the transaction. */
async function lockFlow({ input, actor, tx }) {
  await lockByName(tx, `flow:${actor.organizationId}:${String(input.key ?? '').trim()}`);
  return {};
}

/** The error body the dashboard reads: `error` plus an `errors` list of { step, message }. */
const flowInvalid = (errors, message = 'Invalid flow definition.', status = 400) => new ValidationError(message, {
  status, details: errors.map((e) => ({ path: e.step ?? null, message: e.message })), extra: { errors },
});

function assertValidDefinition(definition, message, status) {
  const check = validateFlow(definition, VALIDATE_KNOWN);
  if (!check.ok) throw flowInvalid(check.errors, message, status);
}

/** All versions of the flow, newest first, or a 404. */
async function requireRows(tx, organizationId, key) {
  const rows = await repo.loadRows(tx, organizationId, key);
  if (rows.length === 0) throw new NotFoundError('Flow not found.');
  return rows;
}

/** Another conversation already answers this starter: say which, and how to proceed. */
const clashError = (clash, triggerType, triggerConfig) => new ConflictError(clashMessage(clash, triggerType, triggerConfig));

const changed = (row, change) => ({ type: 'flow.changed', payload: { flowId: row.id, key: row.key, version: row.version, change } });
/** The running engine caches flows per organization; drop that cache once the change is committed. */
const dropCache = (organizationId) => () => store.invalidate(organizationId);

module.exports = { VALIDATE_KNOWN, lockFlow, flowInvalid, assertValidDefinition, requireRows, clashError, changed, dropCache };
