const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const { EVIDENCE_TYPES } = require('../schemas');
const { askFor, humanize } = require('./words');

/** The evidence rows the context loaded for the chosen subject, plus anything collected before the record existed. */
function candidates(ctx, subject) {
  const own = subject === 'JOB' ? ctx.evidence?.job : ctx.evidence?.driver;
  return [...(own ?? []), ...(ctx.evidence?.pending ?? [])];
}

const newestFirst = (a, b) => new Date(b.created_at) - new Date(a.created_at);

module.exports = defineCheck({
  name: 'evidence_recorded',
  label: 'Evidence was recorded',
  description: 'A piece of evidence (a document, a confirmation, a note, a location or an approval) was recorded for the driver or the job, and is still valid.',
  actions: '*',
  params: z.object({
    name: z.string().min(2).max(60), type: z.enum(EVIDENCE_TYPES), subject: z.enum(['DRIVER', 'JOB']),
    maxAgeMinutes: z.number().int().min(1).optional(),
  }).strict(),
  paramSpec: [
    { name: 'name', label: 'item name (like birth_certificate)', kind: 'string', required: true },
    { name: 'type', label: 'kind of evidence', kind: 'enum', values: EVIDENCE_TYPES, required: true },
    { name: 'subject', label: 'recorded for', kind: 'enum', values: ['DRIVER', 'JOB'], required: true },
    { name: 'maxAgeMinutes', label: 'valid for (minutes)', kind: 'number', min: 1, max: 525600 },
  ],
  dataDependencies: ['evidence'],
  /** What a form or a chat has to collect to satisfy this check. */
  requirement: (params) => ({ name: params.name, type: params.type, label: humanize(params.name) }),
  evaluate: async (ctx, params) => {
    const matching = candidates(ctx, params.subject).filter((row) => row.name === params.name && row.type === params.type).sort(newestFirst);
    const evidence = { kind: 'EVIDENCE', name: params.name, type: params.type, subject: params.subject };
    const label = humanize(params.name);
    if (matching.length === 0) {
      return { pass: false, code: 'EVIDENCE_MISSING', message: askFor(params.type, params.name), reason: `no ${label} is on record`, evidence };
    }
    const valid = matching.filter((row) => !row.expires_at || new Date(row.expires_at) > ctx.now);
    const newest = valid[0];
    const tooOld = newest && params.maxAgeMinutes && ctx.now - new Date(newest.created_at) > params.maxAgeMinutes * 60_000;
    if (!newest || tooOld) {
      return {
        pass: false, code: 'EVIDENCE_EXPIRED', message: `The ${label} is out of date. ${askFor(params.type, params.name)}`,
        reason: `the ${label} on record is out of date`, evidence,
      };
    }
    return { pass: true };
  },
});
