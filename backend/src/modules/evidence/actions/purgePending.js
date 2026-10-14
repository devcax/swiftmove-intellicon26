const { defineAction } = require('../../../platform/registry');
const { purgePendingEvidence } = require('../../../platform/evidence');
const { purgeSchema } = require('../schemas');

module.exports = defineAction({
  name: 'evidence.purgePending',
  title: 'Clear unused pending evidence',
  description: 'Delete evidence collected for a record that was never created, once it is more than 24 hours old.',
  actors: ['SYSTEM'],
  roles: [],
  input: purgeSchema,
  handler: async ({ actor, tx }) => ({
    result: { deleted: await purgePendingEvidence(tx, { organizationId: actor.organizationId }) },
    events: [],
  }),
});
