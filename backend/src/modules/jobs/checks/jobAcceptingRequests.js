const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

module.exports = defineCheck({
  name: 'job_accepting_requests',
  label: 'Job is open for requests',
  description: 'The job is published and has no assigned driver yet.',
  actions: ['request.submit'],
  params: z.object({}),
  dataDependencies: ['jobs'],
  evaluate: async (ctx) => {
    if (ctx.job && ['PUBLISHED', 'DRIVER_REQUESTED'].includes(ctx.job.current_status)) return { pass: true };
    return {
      pass: false,
      code: 'JOB_NOT_OPEN',
      message: `${ctx.job?.job_number} is not open for requests`,
      reason: `the job is ${ctx.job?.current_status ?? 'unknown'}`,
    };
  },
});
