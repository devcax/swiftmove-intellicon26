const { slugify } = require('./author');

const text = (value) => String(value ?? '').trim();

/** The fields of a new policy from what the manager sent, with the defaults the dashboard has always relied on. */
function newPolicyPayload(input, key) {
  return {
    key,
    name: text(input.name),
    description: input.description != null ? text(input.description) || null : null,
    action: input.action,
    enforcement: input.enforcement ?? 'GATEWAY',
    match: input.match ?? {},
    rule: input.rule,
    onBlock: input.onBlock ?? { mode: 'BLOCK' },
    position: Number.isInteger(input.position) ? input.position : 100,
  };
}

/** The next version of a policy: what changed, on top of the version it is based on. */
function revisionPayload(row, changes) {
  return {
    key: row.key,
    name: changes.name != null ? text(changes.name) : row.name,
    description: changes.description !== undefined ? changes.description : row.description,
    action: changes.action ?? row.action,
    enforcement: changes.enforcement ?? row.enforcement,
    match: changes.match ?? row.match,
    rule: changes.rule ?? row.rule,
    onBlock: changes.onBlock ?? row.onBlock,
    position: Number.isInteger(changes.position) ? changes.position : row.position,
  };
}

module.exports = { newPolicyPayload, revisionPayload, slugify };
