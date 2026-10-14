const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

module.exports = defineCheck({
  name: 'pickup_within_hours',
  label: 'Pickup is within a time window',
  description: 'The scheduled pickup is in the future and within the given number of hours from now.',
  actions: ['request.submit'],
  params: z.object({ hours: z.number().min(1).max(720) }),
  paramSpec: [{ name: 'hours', label: 'hours', kind: 'number', min: 1, max: 720, required: true }],
  dataDependencies: ['jobs.pickup_at'],
  evaluate: async (ctx, params) => {
    const pickupAt = new Date(ctx.job?.pickup_at).getTime();
    const hours = Number(params.hours);
    if (Number.isFinite(pickupAt) && pickupAt >= ctx.now.getTime() && pickupAt < ctx.now.getTime() + hours * 3600_000) {
      return { pass: true };
    }
    return {
      pass: false,
      code: 'JOB_OUTSIDE_WINDOW',
      message: `${ctx.job?.job_number} is only available within ${hours} hours of pickup`,
      reason: `the pickup is not within the next ${hours} hours`,
    };
  },
});
