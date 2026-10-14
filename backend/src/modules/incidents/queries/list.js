const { defineQuery } = require('../../../platform/registry');
const { listSchema } = require('../schemas');
const { toIncidentLine } = require('../present');
const repo = require('../repo');

const split = (value) => (value ? String(value).split(',') : null);

module.exports = defineQuery({
  name: 'incident.list',
  description: 'Incidents drivers reported, newest first (at most 200). Filter by status and severity (comma separated).',
  roles: ['ADMIN', 'MANAGER'],
  input: listSchema,
  handler: async ({ input, actor, db }) => (await repo.listIncidents(db, actor.organizationId, { statuses: split(input.status), severities: split(input.severity) })).map(toIncidentLine),
});
