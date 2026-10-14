const { defineQuery } = require('../../../platform/registry');
const { listSchema } = require('../schemas');
const { toJobSummary } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'job.list',
  description: 'List jobs, newest first (at most 200). Filter by status (comma separated) or search the job number and cargo.',
  roles: ['ADMIN', 'MANAGER'],
  input: listSchema,
  handler: async ({ input, actor, db }) => {
    const status = input.status ? String(input.status) : null;
    const rows = await repo.listJobs(db, actor.organizationId, { statuses: status ? status.split(',') : null, search: input.search ? String(input.search) : null });
    return rows.map((row) => ({ ...toJobSummary(row), pickupCode: row.pickup_code ?? null, deliveryCode: row.delivery_code ?? null }));
  },
});
