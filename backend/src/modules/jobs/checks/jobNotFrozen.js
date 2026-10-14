const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const sm = require('../../../platform/jobStateMachine');

const FREEZABLE_STATUSES = ['COMPLETED', 'CANCELLED'];

module.exports = defineCheck({
  name: 'job_not_frozen',
  label: 'Job is not closed',
  description: 'Jobs in one of these statuses are frozen: no milestone, document or correction can change them anymore.',
  actions: ['trip.milestone', 'trip.verifyDocument', 'trip.verifyByManager'],
  params: z.object({ statuses: z.array(z.enum(FREEZABLE_STATUSES)) }),
  paramSpec: [{ name: 'statuses', label: 'frozen statuses', kind: 'enumList', values: FREEZABLE_STATUSES, required: true }],
  dataDependencies: ['jobs'],
  evaluate: async (ctx, params) => {
    const statuses = Array.isArray(params.statuses) ? params.statuses : [];
    const current = ctx.job?.current_status;
    if (!statuses.includes(current)) return { pass: true };
    return {
      pass: false,
      code: 'JOB_FROZEN',
      message:
        current === 'COMPLETED'
          ? 'This job is already completed and closed, so its status cannot change.'
          : current === 'CANCELLED'
            ? 'This job is cancelled, so its status cannot change.'
            : `This job is ${sm.label(current)}, so its status cannot change.`,
      reason: `the job is ${sm.label(current)} and closed for changes`,
    };
  },
});
