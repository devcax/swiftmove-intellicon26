const { defineQuery } = require('../../../platform/registry');
const { listAllSchema } = require('../schemas');
const { mapFlowSummary } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'flow.listAll',
  description: 'List all bot conversations (flows) in short: name, what starts each one, whether it is live or only a draft. Use this to answer which conversations exist or whether one is active.',
  roles: ['ADMIN', 'MANAGER'],
  input: listAllSchema,
  handler: async ({ input, actor, db }) => {
    const wanted = String(input.search ?? '').trim().toLowerCase();
    const groups = await repo.loadAllByKey(db, actor.organizationId);
    const flows = groups.map(mapFlowSummary)
      .filter((flow) => !wanted || `${flow.key} ${flow.name} ${flow.description ?? ''} ${flow.startsWhen}`.toLowerCase().includes(wanted))
      .map((flow) => ({
        key: flow.key, name: flow.name, description: flow.description, startsWhen: flow.startsWhen, builtIn: flow.isSystem,
        status: flow.publishedVersion ? (flow.enabled ? 'live' : 'paused') : 'draft only',
        liveVersion: flow.publishedVersion, draftVersion: flow.draftVersion,
      }));
    return { total: flows.length, live: flows.filter((flow) => flow.status === 'live').length, flows };
  },
});
