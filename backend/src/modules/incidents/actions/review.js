const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const { currentMilestoneRank } = require('../../../platform/policy/context');
const records = require('../../../platform/jobRecords');
const sm = require('../../../platform/jobStateMachine');
const { reviewSchema } = require('../schemas');
const { lockIncident, findIncidentWithJob, changed } = require('../load');
const repo = require('../repo');

const notesOf = (input) => (typeof input.managerNotes === 'string' ? input.managerNotes : null);

/** The three things a manager does with an open incident: resolve it, mark it under review, or keep it open. */
function createReviewAction({ name, title, description, outcome, status, auditAction, change }) {
  return defineAction({
    name, title, description, actors: ['MANAGER'], roles: ['ADMIN', 'MANAGER'], input: reviewSchema, load: lockIncident,
    handler: async ({ input, actor, tx }) => {
      const incident = await findIncidentWithJob(tx, input.id);
      const notes = notesOf(input);
      const managerNotes = notes ?? incident.manager_notes;
      const by = { type: 'MANAGER', userId: actor.userId };

      if (outcome === 'resolve') {
        await repo.resolveIncident(tx, incident.id, { status, managerNotes, userId: actor.userId });
        // A job held at INCIDENT_OPEN goes back to the furthest milestone it had reached.
        if (incident.job_status === 'INCIDENT_OPEN') {
          await lockRow(tx, 'jobs', incident.job_id, actor.organizationId);
          const rank = await currentMilestoneRank(tx, await records.findJobRow(tx, incident.job_id));
          const restored = Object.keys(sm.MILESTONE_RANK).find((k) => sm.MILESTONE_RANK[k] === rank) ?? 'IN_PROGRESS';
          const job = await records.findJob(tx, actor.organizationId, incident.job_id);
          await records.setStatus(tx, job, restored, by);
        }
      } else {
        await repo.setIncidentStatus(tx, incident.id, { status, managerNotes });
      }
      await records.audit(tx, { organizationId: actor.organizationId, actor: by, action: auditAction, entityType: 'INCIDENT', entityId: incident.id, after: { notes } });
      return { result: { ok: true, jobNumber: incident.job_number }, events: [changed(incident, change)], subject: { type: 'INCIDENT', id: incident.id } };
    },
  });
}

module.exports = {
  resolve: createReviewAction({
    name: 'incident.resolve', outcome: 'resolve', status: 'RESOLVED', auditAction: 'INCIDENT_RESOLVE', change: 'resolved',
    title: 'Resolve an incident', description: 'Close an incident. A job held by it goes back to the furthest milestone it had reached.',
  }),
  markUnderReview: createReviewAction({
    name: 'incident.markUnderReview', outcome: 'review', status: 'UNDER_REVIEW', auditAction: 'INCIDENT_UNDER_REVIEW', change: 'under_review',
    title: 'Mark an incident as under review', description: 'Show that someone is working on an incident.',
  }),
  keepOpen: createReviewAction({
    name: 'incident.keepOpen', outcome: 'review', status: 'OPEN', auditAction: 'INCIDENT_KEEP_OPEN', change: 'kept_open',
    title: 'Keep an incident open', description: 'Put an incident back to open.',
  }),
};
