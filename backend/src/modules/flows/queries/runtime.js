const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const store = require('../store');

// Read by the WhatsApp side while it runs a conversation; not part of the dashboard.
const common = { actors: ['SYSTEM'], roles: [] };

const listLive = defineQuery({
  ...common, name: 'flow.listLive', input: z.object({}),
  description: 'The published, enabled flows of the organization as the conversation runtime reads them. Nothing when they cannot be read.',
  handler: async ({ actor }) => store.listLive(actor.organizationId),
});

const getVersion = defineQuery({
  ...common, name: 'flow.getVersion', input: z.object({ key: z.string().min(1).max(80), version: z.number().int().min(1) }),
  description: 'One specific version of a flow, so a conversation that started on it finishes on it.',
  handler: async ({ input, actor }) => store.findVersion(actor.organizationId, input.key, input.version),
});

module.exports = { listLive, getVersion };
