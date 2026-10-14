const { defineQuery } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { ID_SHAPE } = require('../../../platform/http/ownership');
const { idSchema } = require('../schemas');
const { toIncidentDetail } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'incident.get',
  description: 'One incident with the message it came from, its location and its photos.',
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  handler: async ({ input, actor, db }) => {
    const row = ID_SHAPE.test(input.id) ? await repo.findIncident(db, actor.organizationId, input.id) : null;
    if (!row) throw new NotFoundError('Incident not found');
    return toIncidentDetail(row, await repo.listAttachments(db, input.id));
  },
});
