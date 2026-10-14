const { NotFoundError } = require('../../platform/errors');
const { ID_SHAPE } = require('../../platform/http/ownership');
const { lockRow } = require('../../platform/db');
const repo = require('./repo');

/** Lock the incident for this transaction. An incident of another organization is reported as missing. */
async function lockIncident({ input, actor, tx }) {
  const id = input.id ?? input.incidentId;
  if (!ID_SHAPE.test(id) || !(await lockRow(tx, 'incidents', id, actor.organizationId))) throw new NotFoundError('Incident not found');
  return { subject: { type: 'INCIDENT', id } };
}

const changed = (incident, change) => ({ type: 'incident.changed', payload: { incidentId: incident.id, jobId: incident.job_id, change } });

module.exports = { lockIncident, findIncidentWithJob: repo.findIncidentWithJob, changed };
