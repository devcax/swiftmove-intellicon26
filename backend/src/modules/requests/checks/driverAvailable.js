const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

module.exports = defineCheck({
  name: 'driver_available',
  label: 'Driver has no active job',
  description: 'The driver is not tied to another job (no live assignment).',
  actions: ['request.submit'],
  params: z.object({}),
  dataDependencies: ['job_assignments'],
  evaluate: async (ctx) => {
    if (!ctx.assignment) return { pass: true };
    return {
      pass: false,
      code: 'DRIVER_BUSY',
      message: `Driver already tied to ${ctx.assignment.job_number}`,
      reason: `the driver already has a live assignment on ${ctx.assignment.job_number}`,
    };
  },
});
