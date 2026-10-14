const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const { fmtWhen } = require('../../../platform/time');

module.exports = defineCheck({
  name: 'started_within_hours_of_pickup',
  label: 'Trip start is inside the start window',
  description: 'The trip can only be started within the given number of hours before the scheduled pickup.',
  actions: ['trip.start'],
  params: z.object({ hours: z.number().min(1).max(720) }),
  paramSpec: [{ name: 'hours', label: 'hours', kind: 'number', min: 1, max: 720, required: true }],
  dataDependencies: ['jobs.pickup_at'],
  evaluate: async (ctx, params) => {
    const hours = Number(params.hours);
    if (!ctx.job?.pickup_at) return { pass: true };
    const earliest = new Date(new Date(ctx.job.pickup_at).getTime() - hours * 3600_000);
    if (ctx.now.getTime() >= earliest.getTime()) return { pass: true };
    return {
      pass: false,
      code: 'START_TOO_EARLY',
      message:
        `This job can only be started within ${hours} hours of the scheduled pickup time. ` +
        `Pickup is scheduled for ${fmtWhen(ctx.job.pickup_at)}, so you can start it from ${fmtWhen(earliest)}.`,
      reason: `the start window opens ${hours} hours before pickup`,
    };
  },
});
