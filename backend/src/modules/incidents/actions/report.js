const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const { getPolicySetting } = require('../../../platform/policy/store');
const records = require('../../../platform/jobRecords');
const { reportSchema } = require('../schemas');
const { INCIDENT_TYPES, SEVERITIES } = require('../vocabulary');
const { stateError, lockActingDriver } = require('./driverLoad');
const repo = require('../repo');
const { notify } = require('../../notifications/engine');

/** Floors are a manager-tunable setting; the defaults are the old hardcoded rule (an accident is critical, anything else high). */
async function pickSeverity(organizationId, type, requested) {
  const setting = await getPolicySetting(organizationId, 'incident.severity-floor', { defaultSeverity: 'HIGH', floors: { ACCIDENT: 'CRITICAL' } });
  const floors = setting?.floors && typeof setting.floors === 'object' ? setting.floors : {};
  const fallback = SEVERITIES.includes(setting?.defaultSeverity) ? setting.defaultSeverity : 'HIGH';
  return SEVERITIES.includes(floors[type]) ? floors[type] : SEVERITIES.includes(requested) ? requested : fallback;
}

module.exports = defineAction({
  name: 'incident.report',
  title: 'Report an incident',
  description: 'A driver reports an accident, breakdown, damage or other problem on their job. The managers are alerted. A repeat of an open incident is merged into it.',
  actors: ['DRIVER'],
  matchFields: ['incidentType'],
  input: reportSchema,
  load: async ({ input, actor, tx }) => {
    await lockActingDriver({ actor, tx });
    const assignment = await records.findDriverLiveAssignment(tx, actor.organizationId, actor.driverId);
    if (!assignment) throw stateError('No active job for this report', 'BAD_STATE');
    await lockRow(tx, 'jobs', assignment.jobId, actor.organizationId);
    const type = INCIDENT_TYPES.includes(input.incidentType) ? input.incidentType : 'OTHER';
    return { driverId: actor.driverId, jobId: assignment.jobId, assignment, incidentType: type, params: { incidentType: type }, subject: { type: 'JOB', id: assignment.jobId } };
  },
  handler: async ({ input, actor, tx, subject, warnings }) => {
    const organizationId = actor.organizationId;
    const { assignment, incidentType: type } = subject;
    const job = await records.findJob(tx, organizationId, assignment.jobId);
    const severity = await pickSeverity(organizationId, type, input.severity);

    // A published WARN policy merges a repeat report into the incident already open instead of making a second record.
    const duplicate = warnings.find((w) => w.code === 'DUPLICATE_INCIDENT');
    if (duplicate?.details?.incidentId) {
      await repo.attachPhoto(tx, duplicate.details.incidentId, input.attachmentId);
      return {
        result: {
          jobId: job.id, assignmentId: assignment.id, incidentId: duplicate.details.incidentId, incidentType: duplicate.details.incidentType ?? type,
          severity: duplicate.details.severity ?? severity, alreadyReported: true,
        },
        events: [], subject: { type: 'JOB', id: job.id },
      };
    }

    const eventType = input.eventType ?? 'INCIDENT_REPORTED';
    const by = { type: 'DRIVER', driverId: actor.driverId };
    const incident = await repo.insertIncident(tx, {
      jobId: job.id, assignmentId: assignment.id, reportedByDriverId: actor.driverId, sourceMessageId: input.messageId ?? null, incidentType: type, severity, description: input.description,
    });
    await records.recordEvent(tx, {
      jobId: job.id, assignmentId: assignment.id, messageId: input.messageId, eventType, status: 'REVIEW_REQUIRED',
      data: { ...(input.data ?? {}), incident_id: incident.id, incident_type: type, severity }, confidence: input.confidence,
    });
    if (eventType === 'INCIDENT_REPORTED') await records.setStatus(tx, job, 'INCIDENT_OPEN', by);
    else if (eventType === 'FAILED_DELIVERY') await records.setStatus(tx, job, 'FAILED_DELIVERY', by);

    const driverName = await records.findDriverName(tx, actor.driverId);
    await notify(tx, 'incidentReported', { organizationId, jobId: job.id, jobNumber: job.jobNumber,
      incidentId: incident.id, driverName, description: input.description, severity });
    const notice = {
      incidentId: incident.id, type: 'INCIDENT', title: `${type} on ${job.jobNumber}`,
      body: `${driverName}: ${input.description}${input.imageUrl ? `\nPhoto: ${input.imageUrl}` : ''}`, severity: severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    };
    await records.audit(tx, { organizationId, actor: by, action: 'INCIDENT_REPORTED', entityType: 'INCIDENT', entityId: incident.id, after: { type, severity } });
    await repo.attachPhoto(tx, incident.id, input.attachmentId);

    return {
      result: { jobId: job.id, assignmentId: assignment.id, incidentId: incident.id, incidentType: type, severity },
      events: [{ type: 'incident.reported', payload: { incidentId: incident.id, jobId: job.id, incidentType: type, severity, notice } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
