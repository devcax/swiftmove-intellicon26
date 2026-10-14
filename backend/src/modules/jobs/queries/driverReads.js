const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const repo = require('../repo');

// Reads the WhatsApp side and the timer use: find a job by the number a driver typed, and find delivered jobs nobody closed.
const common = { actors: ['DRIVER', 'SYSTEM'], roles: [] };

const findByNumber = defineQuery({
  ...common, name: 'job.findByNumber', description: 'Find a job of the organization by the number a driver typed ("JOB-123", "#123" or "123"). Nothing when there is none.',
  input: z.object({ jobRef: z.string().max(80).nullish() }),
  handler: async ({ input, actor, db }) => {
    if (!input.jobRef) return null;
    const cleaned = String(input.jobRef).toUpperCase().trim();
    const number = cleaned.startsWith('JOB-') ? cleaned : cleaned.replace(/^#?/, '');
    const withPrefix = number.startsWith('JOB-') ? number : `JOB-${number}`;
    return repo.findJobByNumber(db, actor.organizationId, number, withPrefix);
  },
});

const dueForClosure = defineQuery({
  ...common, name: 'job.dueForClosure', description: 'Delivered jobs with a driver still on them whose delivery was confirmed longer ago than the given number of minutes (at most 25).',
  input: z.object({ minutes: z.number().min(0).max(100000) }),
  handler: async ({ input, db }) => {
    return repo.listJobIdsDueForClosure(db, input.minutes);
  },
});

module.exports = { findByNumber, dueForClosure };
