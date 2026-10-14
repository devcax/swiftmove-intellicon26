const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const sm = require('../../../platform/jobStateMachine');

module.exports = defineCheck({
  name: 'trip_started_explicit',
  label: 'Driver explicitly started the trip',
  description: 'Progress beyond "started" is only accepted after the driver confirmed the trip start.',
  actions: ['trip.milestone'],
  params: z.object({}),
  dataDependencies: ['job_assignments.started_at', 'jobs.current_status'],
  evidence: { kind: 'START_CONFIRMATION' },
  evaluate: async (ctx) => {
    const source = ctx.params.source ?? 'CHAT';
    const targetRank = sm.MILESTONE_RANK[ctx.params.milestone];
    if (targetRank == null) return { pass: true };
    const currentRank = ctx.currentRank ?? 0;
    if (source !== 'MANAGER' && currentRank < sm.STAGE_RANK.IN_PROGRESS && targetRank > sm.STAGE_RANK.IN_PROGRESS) {
      return {
        pass: false,
        code: 'START_CONFIRMATION_REQUIRED',
        message: 'This job has not been marked as started yet. The driver has to confirm the start explicitly first.',
        reason: 'the trip start has not been confirmed yet',
        evidence: { kind: 'START_CONFIRMATION' },
      };
    }
    return { pass: true };
  },
});
