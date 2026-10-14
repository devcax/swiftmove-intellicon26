const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

module.exports = defineCheck({
  name: 'delivery_within_days',
  label: 'Delivery is within a schedule limit',
  description: 'The scheduled delivery is after the scheduled pickup and at most this many days later.',
  actions: ['job.create'],
  params: z.object({ days: z.number().min(1).max(30) }),
  paramSpec: [{ name: 'days', label: 'days', kind: 'number', min: 1, max: 30, required: true }],
  dataDependencies: ['jobs.pickup_at', 'jobs.delivery_at'],
  evaluate: async (ctx, params) => {
    const pickup = new Date(ctx.params.pickupAt ?? ctx.job?.pickup_at).getTime();
    const delivery = new Date(ctx.params.deliveryAt ?? ctx.job?.delivery_at).getTime();
    const days = Number(params.days);
    if (!Number.isFinite(pickup) || !Number.isFinite(delivery)) return { pass: true };
    if (delivery > pickup && delivery - pickup <= days * 24 * 3600_000) return { pass: true };
    return {
      pass: false,
      code: 'SCHEDULE_TOO_LONG',
      message: `Delivery must be after the pickup and within ${days} days of it.`,
      reason:
        delivery <= pickup
          ? 'the delivery is not after the pickup'
          : `the delivery is more than ${days} days after the pickup`,
    };
  },
});
