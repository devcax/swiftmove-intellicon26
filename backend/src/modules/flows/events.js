const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');

module.exports = [
  defineEvent({
    name: 'flow.changed', description: 'A flow was created, saved, published, rolled back, switched on or off, or deleted.',
    payload: z.object({ flowId: z.guid(), key: z.string(), version: z.number().int(), change: z.string() }),
  }),
];
