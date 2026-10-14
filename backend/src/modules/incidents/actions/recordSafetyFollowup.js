const { defineAction } = require('../../../platform/registry');
const { followupSchema } = require('../schemas');
const { lockIncident, findIncidentWithJob, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'incident.recordSafetyFollowup',
  title: 'Record the safety follow-up',
  description:
    'Record what the driver answered in the safety check after an accident or critical incident: where they are, whether they need a backup vehicle, and ' +
    'that the check is complete. Completing it twice keeps the first time.',
  actors: ['DRIVER', 'SYSTEM'],
  input: followupSchema,
  load: ({ input, actor, tx }) => lockIncident({ input: { id: input.incidentId }, actor, tx }),
  handler: async ({ input, tx }) => {
    const incident = await findIncidentWithJob(tx, input.incidentId);
    if (input.lat != null && input.lng != null) {
      await repo.recordLocation(tx, incident.id, input.lat, input.lng);
    }
    if (input.backupVehicle) await repo.setBackupVehicle(tx, incident.id, input.backupVehicle);
    if (input.complete) await repo.completeSafetyFollowup(tx, incident.id);
    return { result: { ok: true }, events: [changed(incident, input.complete ? 'safety_followup_recorded' : 'safety_details_recorded')], subject: { type: 'INCIDENT', id: incident.id } };
  },
});
