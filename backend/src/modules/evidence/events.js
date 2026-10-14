const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');

module.exports = [
  defineEvent({
    name: 'evidence.recorded', description: 'A piece of evidence was recorded for a driver or a job.',
    payload: z.object({ evidenceId: z.guid(), subjectType: z.string(), subjectId: z.guid(), name: z.string() }),
  }),
  defineEvent({
    name: 'evidence.revoked', description: 'A piece of evidence was withdrawn.',
    payload: z.object({ evidenceId: z.guid(), subjectType: z.string(), subjectId: z.guid(), name: z.string() }),
  }),
];
