const { defineQuery } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const { listSchema } = require('../schemas');
const { toRequestLine } = require('../present');
const repo = require('../repo');

const STATUSES = new Set(['REQUESTED', 'CANCELLED_BY_DRIVER', 'REJECTED', 'APPROVED', 'EXPIRED']);

module.exports = defineQuery({
  name: 'request.list',
  description: 'Driver requests for jobs, by status (comma separated; pending ones by default), most recently reviewed first.',
  roles: ['ADMIN', 'MANAGER'],
  input: listSchema,
  handler: async ({ input, actor, db }) => {
    const statuses = String(input.status ?? 'REQUESTED').split(',').map((s) => s.trim().toUpperCase()).filter((s) => STATUSES.has(s));
    if (statuses.length === 0) throw new ValidationError('A valid request status is required.');
    return (await repo.listRequests(db, actor.organizationId, statuses)).map(toRequestLine);
  },
});
