/**
 * What other modules may ask of flows without knowing how flows are stored: draft a definition with the AI author (validated by the same
 * rules as the editor), and save a draft. Nothing here publishes.
 */
const { draftFlow } = require('./author');
const { validateFlow } = require('./flowValidate');
const { ACTION_NAMES, ACTION_LABELS, PROMPT_PROVIDER_NAMES, PROMPT_PROVIDER_LABELS } = require('./vocabulary');
const { VALIDATE_KNOWN, assertValidDefinition } = require('./load');
const { mapVersion } = require('./present');
const { ConflictError } = require('../../platform/errors');
const { lockByName } = require('../../platform/db');
const repo = require('./repo');

const catalog = (names, labels) => names.map((n) => `- ${n} — ${labels[n] ?? n}`).join('\n');

/**
 * Draft a flow from a description. `extraValidate(definition)` may add its own complaints ([{ step, message }]); they are fed back to the
 * model on the one retry exactly like the validator's. Returns draftFlow's result.
 */
function generateDefinition({ description, organizationId, extraValidate = () => [], chat }) {
  return draftFlow({
    description, organizationId, chat,
    catalogs: { actions: catalog(ACTION_NAMES, ACTION_LABELS), promptProviders: catalog(PROMPT_PROVIDER_NAMES, PROMPT_PROVIDER_LABELS) },
    validate: (definition) => {
      const check = validateFlow(definition, VALIDATE_KNOWN);
      const extra = check.ok ? extraValidate(definition) : [];
      return { ok: check.ok && extra.length === 0, errors: [...(check.errors ?? []), ...extra] };
    },
  });
}

/**
 * Save a definition as a DRAFT of the flow `key`: a new flow, a new version of one that is live, or the working draft of one that has
 * a draft. Runs in the caller's transaction. Returns { key, version } as the dashboard reads a saved flow.
 */
async function saveGeneratedDraft(tx, { organizationId, actorUserId, key, name, description, definition, triggerType, triggerConfig }) {
  assertValidDefinition(definition);
  await lockByName(tx, `flow:${organizationId}:${key}`);
  const rows = await repo.loadRows(tx, organizationId, key);
  const latest = rows[0] ?? null;
  if (latest?.isSystem) throw new ConflictError('A built-in flow cannot be replaced by a generated one.');
  let saved;
  if (!latest) {
    saved = await repo.insertVersion(tx, organizationId, { key, name, description, version: 1, triggerType, triggerConfig, definition });
  } else if (latest.status === 'DRAFT') {
    saved = await repo.updateDraft(tx, organizationId, latest.id, { name, description, definition });
  } else {
    saved = await repo.insertVersion(tx, organizationId, { key, name, description, version: latest.version + 1, triggerType: latest.triggerType, triggerConfig: latest.triggerConfig, definition });
  }
  await repo.audit(tx, { organizationId, actorUserId, action: latest ? 'FLOW_VERSION_SAVED' : 'FLOW_CREATED', entityId: saved.id, before: latest ? mapVersion(latest) : null, after: mapVersion(saved) });
  return { key, version: mapVersion(saved), row: saved };
}

module.exports = { generateDefinition, saveGeneratedDraft };
