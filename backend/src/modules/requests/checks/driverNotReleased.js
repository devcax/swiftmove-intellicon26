const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

module.exports = defineCheck({
  name: 'driver_not_released',
  label: 'Driver was not released from this job',
  description: 'The driver was not previously released from this job by a manager.',
  actions: ['request.submit'],
  params: z.object({}),
  dataDependencies: ['job_assignments'],
  evaluate: async (ctx) => {
    if (!ctx.releasedFromJob) return { pass: true };
    return {
      pass: false,
      code: 'DRIVER_RELEASED',
      message: `You were released from ${ctx.job?.job_number}, so it cannot be requested again`,
      reason: 'a manager released this driver from the job before',
    };
  },
});
