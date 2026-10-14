const { defineAction } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const { notesSchema } = require('../schemas');
const { lockIncident, findIncidentWithJob, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'incident.saveNotes',
  title: 'Save the notes on an incident',
  description: 'Replace the manager\'s notes on an incident. An empty text clears them.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: notesSchema,
  load: async (args) => {
    const subject = await lockIncident(args); // a missing incident is a 404 before the text is judged, as before
    if (typeof args.input.managerNotes !== 'string') throw new ValidationError('managerNotes is required');
    return subject;
  },
  handler: async ({ input, tx }) => {
    const incident = await findIncidentWithJob(tx, input.id);
    await repo.saveManagerNotes(tx, incident.id, input.managerNotes);
    return { result: { ok: true }, events: [changed(incident, 'notes_saved')], subject: { type: 'INCIDENT', id: incident.id } };
  },
});
