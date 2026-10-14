const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const sm = require('../../../platform/jobStateMachine');

const STAGES = Object.keys(sm.MILESTONE_RANK);

module.exports = defineCheck({
  name: 'job_rank_at_least',
  label: 'Trip has reached a stage',
  description: 'The job has reached at least the given milestone (e.g. delivered).',
  actions: ['job.requestClosure'],
  params: z.object({ status: z.enum(STAGES) }),
  paramSpec: [{ name: 'status', label: 'stage', kind: 'enum', values: STAGES, required: true }],
  dataDependencies: ['jobs', 'workflow_events'],
  evaluate: async (ctx, params) => {
    const need = sm.MILESTONE_RANK[params.status];
    if (need != null && (ctx.currentRank ?? 0) >= need) return { pass: true };
    return {
      pass: false,
      code: params.status === 'DELIVERED' ? 'NOT_DELIVERED' : 'STAGE_NOT_REACHED',
      message:
        params.status === 'DELIVERED'
          ? 'The delivery is not confirmed yet. Send a photo of the delivery document so the delivery code can be verified, then I can send this job for closure.'
          : `The job has not reached ${sm.label(params.status)} yet.`,
      reason: `the trip has not reached ${sm.label(params.status)} yet`,
    };
  },
});
