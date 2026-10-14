const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const sm = require('../../../platform/jobStateMachine');
const { loadDriverTrip, stateError } = require('../load');
const { executeTransition, milestoneEvent } = require('../transition');

const schema = z.object({
  eventType: z.string().min(1).max(60), data: z.record(z.string(), z.unknown()).optional(), messageId: z.guid().nullish(), confidence: z.number().nullish(),
  source: z.enum(['CHAT', 'DOCUMENT', 'MANAGER']).optional(),
});

module.exports = defineAction({
  name: 'trip.milestone',
  title: 'Report trip progress',
  description: 'A progress update moves the job to a milestone (arrived at pickup, loaded, departed, ...). Steps the driver skipped are filled in and marked as inferred.',
  actors: ['DRIVER'],
  matchFields: ['milestone'],
  input: schema,
  load: async (args) => {
    const { input } = args;
    if (!sm.MILESTONE_EVENTS.includes(input.eventType)) throw stateError(`${input.eventType} is not a milestone event`, 'NOT_A_MILESTONE');
    const subject = await loadDriverTrip(args, { statuses: ['ASSIGNED', 'ACTIVE'], message: 'You do not have a job in progress right now.' });
    const job = await records.findJob(args.tx, args.actor.organizationId, subject.jobId);
    if (job.currentStatus === 'CANCELLATION_REVIEW') {
      throw stateError('This job is waiting for the manager to review your cancellation request, so progress updates are paused.', 'JOB_FROZEN');
    }
    const source = input.source ?? 'CHAT';
    return { ...subject, params: { milestone: input.eventType }, policyActor: source === 'MANAGER' ? 'MANAGER' : 'DRIVER', policySource: source };
  },
  handler: async ({ input, actor, tx, subject }) => {
    const job = await records.findJob(tx, actor.organizationId, subject.jobId);
    const result = await executeTransition(tx, {
      job, assignment: subject.assignment, eventType: input.eventType, data: input.data ?? {}, source: input.source ?? 'CHAT',
      messageId: input.messageId, confidence: input.confidence, actor: { type: 'DRIVER', driverId: actor.driverId },
    });
    return { result: { jobId: job.id, assignmentId: subject.assignment.id, ...result }, events: milestoneEvent(job, result), subject: { type: 'JOB', id: job.id } };
  },
});
