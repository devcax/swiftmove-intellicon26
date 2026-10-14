const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');
const { notice } = require('../../platform/notice');

module.exports = [
  defineEvent({
    name: 'incident.reported', description: 'A driver reported an incident on their job.',
    payload: z.object({ incidentId: z.guid(), jobId: z.guid(), incidentType: z.string(), severity: z.string(), notice: notice.optional() }),
  }),
  defineEvent({
    name: 'incident.changed', description: 'A manager resolved, reopened or annotated an incident, or the safety follow-up was recorded.',
    payload: z.object({ incidentId: z.guid(), jobId: z.guid(), change: z.string() }),
  }),
];
