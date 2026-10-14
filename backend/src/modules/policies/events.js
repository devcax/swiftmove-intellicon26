const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');

module.exports = [
  defineEvent({
    name: 'policy.changed', description: 'A policy was created, revised, published, switched on or off, archived or deleted.',
    payload: z.object({ policyId: z.guid(), key: z.string(), version: z.number().int(), change: z.string() }),
  }),
];
