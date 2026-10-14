const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { z } = require('zod');
const { loadDriverTrip } = require('../load');
const repo = require('../repo');

const schema = z.object({ messageId: z.guid().nullish(), confidence: z.number().nullish() });

module.exports = defineAction({
  name: 'trip.start',
  title: 'Start the trip',
  description: 'A driver confirms they are starting the job assigned to them. The start window (24 hours before pickup by default) is a policy.',
  actors: ['DRIVER'],
  input: schema,
  load: async (args) => {
    const subject = await loadDriverTrip(args, { statuses: ['ASSIGNED', 'ACTIVE'], message: 'You can only start a job that is assigned to you' });
    // Already running (a repeat "start the job"): report success without a second start and without asking the policies.
    return subject.assignment.status === 'ACTIVE' ? { ...subject, skipPolicies: true } : subject;
  },
  handler: async ({ input, actor, tx, subject }) => {
    const { assignment } = subject;
    const job = await records.findJob(tx, actor.organizationId, assignment.jobId);
    if (assignment.status === 'ACTIVE') {
      return { result: { jobId: job.id, assignmentId: assignment.id, alreadyStarted: true }, events: [], subject: { type: 'JOB', id: job.id } };
    }
    await repo.startAssignment(tx, assignment.id);
    await records.setStatus(tx, job, 'IN_PROGRESS', { type: 'DRIVER', driverId: actor.driverId });
    await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment.id, messageId: input.messageId, eventType: 'START_JOB', confidence: input.confidence });
    return {
      result: { jobId: job.id, assignmentId: assignment.id, alreadyStarted: false },
      events: [{ type: 'trip.started', payload: { jobId: job.id, driverId: actor.driverId, assignmentId: assignment.id } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
