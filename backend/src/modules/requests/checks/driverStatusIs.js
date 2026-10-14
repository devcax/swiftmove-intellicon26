const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

const DRIVER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

module.exports = defineCheck({
  name: 'driver_status_is',
  label: 'Driver account status',
  description: 'The driver account is in the given status.',
  // No built-in policy uses it, so it stays available on every action (as before the move).
  actions: '*',
  params: z.object({ status: z.enum(DRIVER_STATUSES) }),
  paramSpec: [{ name: 'status', label: 'status', kind: 'enum', values: DRIVER_STATUSES, required: true }],
  dataDependencies: ['drivers'],
  evaluate: async (ctx, params) => {
    if (ctx.driver && ctx.driver.status === params.status) return { pass: true };
    return {
      pass: false,
      code: 'DRIVER_STATUS',
      message: `Your driver account is not ${String(params.status).toLowerCase()} right now.`,
      reason: `driver status is ${ctx.driver?.status ?? 'unknown'}, not ${params.status}`,
    };
  },
});
