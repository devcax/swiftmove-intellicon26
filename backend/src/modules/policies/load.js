const { lockRow } = require('../../platform/db');
const { NotFoundError } = require('../../platform/errors');

/** Lock the policy row for this transaction. A policy of another organization is reported as missing. */
async function lockPolicy({ input, actor, tx }) {
  if (!(await lockRow(tx, 'policy_definitions', input.id, actor.organizationId))) throw new NotFoundError('Policy not found.');
  return { subject: { type: 'POLICY', id: input.id } };
}

const changed = (row, change) => ({ type: 'policy.changed', payload: { policyId: row.id, key: row.key, version: row.version, change } });

module.exports = { lockPolicy, changed };
