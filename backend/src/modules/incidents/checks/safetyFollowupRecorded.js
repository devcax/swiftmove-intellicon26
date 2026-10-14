const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

module.exports = defineCheck({
  name: 'safety_followup_recorded',
  label: 'Safety follow-up completed',
  description:
    'After an accident or critical incident the driver answered the safety check ' +
    '(location shared, backup need confirmed) for the latest such incident.',
  actions: ['job.requestClosure', 'trip.requestCancellation'],
  params: z.object({}),
  dataDependencies: ['incidents'],
  evidence: { kind: 'SAFETY_FOLLOWUP' },
  evaluate: async (ctx) => {
    const openSafety = (ctx.openIncidents ?? []).filter((i) => i.incident_type === 'ACCIDENT' || i.severity === 'CRITICAL');
    if (openSafety.length === 0) return { pass: true };
    const latest = openSafety[0];
    if (openSafety.every((i) => i.safety_followup_at)) return { pass: true };
    return {
      pass: false,
      code: 'SAFETY_FOLLOWUP_REQUIRED',
      message: 'Before we continue, I need to finish the safety check for the incident you reported.',
      reason: 'the safety follow-up for the open incident has not been completed',
      evidence: { kind: 'SAFETY_FOLLOWUP', incidentId: latest.id },
      details: { incidentId: latest.id },
    };
  },
});
