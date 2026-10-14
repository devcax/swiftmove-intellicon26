const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');

module.exports = [
  defineEvent({
    name: 'aiInstruction.changed', description: 'An AI instruction was customized or reset to its default.',
    payload: z.object({ instructionId: z.guid(), key: z.string(), change: z.enum(['updated', 'reset']) }),
  }),
];
