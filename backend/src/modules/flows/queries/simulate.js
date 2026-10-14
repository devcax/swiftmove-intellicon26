const { defineQuery } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { simulateSchema } = require('../schemas');
const { assertValidDefinition } = require('../load');
const { runSimulation } = require('../simulate');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'flow.simulate',
  description: 'Dry-run a flow with sample driver replies. It sends no WhatsApp message and touches no job.',
  roles: ['ADMIN', 'MANAGER'],
  input: simulateSchema,
  handler: async ({ input, actor, db }) => {
    const rows = await repo.loadRows(db, actor.organizationId, input.key);
    if (rows.length === 0) throw new NotFoundError('Flow not found.');
    const row = rows.find((r) => r.version === Number(input.version)) ?? rows[0];
    assertValidDefinition(row.definition);
    const inputs = Array.isArray(input.inputs) ? input.inputs.slice(0, 50) : [];
    return runSimulation(row, inputs, input.startData);
  },
});
