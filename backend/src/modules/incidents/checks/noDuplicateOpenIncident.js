const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

module.exports = defineCheck({
  name: 'no_duplicate_open_incident',
  label: 'No duplicate open incident',
  description: 'There is no open incident of the same type on this job yet (duplicates are merged, not blocked).',
  actions: ['incident.report'],
  params: z.object({}),
  dataDependencies: ['incidents'],
  evaluate: async (ctx) => {
    const type = ctx.params.incidentType;
    const existing = (ctx.openIncidents ?? []).find((i) => !type || i.incident_type === type);
    if (!existing) return { pass: true };
    return {
      pass: false,
      code: 'DUPLICATE_INCIDENT',
      message: `You already reported this ${String(existing.incident_type).toLowerCase()} — the manager has it on file.`,
      reason: `an open ${existing.incident_type} incident already exists for this job`,
      details: { incidentId: existing.id, incidentType: existing.incident_type, severity: existing.severity },
    };
  },
});
