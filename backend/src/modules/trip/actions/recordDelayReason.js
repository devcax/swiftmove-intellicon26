const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { fmtWhen } = require('../../../platform/time');
const { loadDriverTrip, stateError } = require('../load');
const { stageDelay } = require('../delay');
const repo = require('../repo');

const schema = z.object({ stage: z.enum(['PICKUP', 'DELIVERY']), reason: z.string().min(1).max(500), messageId: z.guid().nullish() });

module.exports = defineAction({
  name: 'trip.recordDelayReason',
  title: 'Record why a stage was late',
  description: 'The driver says why the pickup or delivery was late. The managers are told. Recording it twice keeps the first reason.',
  actors: ['DRIVER'],
  input: schema,
  load: (args) => loadDriverTrip(args, { statuses: ['ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW'], message: 'You do not have a job in progress right now.' }),
  handler: async ({ input, actor, tx, subject }) => {
    const { stage, reason, messageId } = input;
    const job = await records.findJob(tx, actor.organizationId, subject.jobId);
    const delay = stageDelay(job, stage);
    if (!delay.late) throw stateError(`There is no late ${stage.toLowerCase()} on record for this job.`, 'NO_DELAY');
    const base = { jobId: job.id, stage, ...delay };
    if (delay.reasonRecorded) return { result: { ...base, alreadyRecorded: true }, events: [], subject: { type: 'JOB', id: job.id } };

    const column = stage === 'PICKUP' ? 'pickupDelayReason' : 'deliveryDelayReason';
    await repo.updateJobColumns(tx, job.id, { [column]: reason });
    await records.recordEvent(tx, {
      jobId: job.id, assignmentId: subject.assignment.id, messageId, eventType: 'DELAY_REPORTED', confidence: 1,
      data: { stage, reason, scheduled_at: delay.scheduledAt, actual_at: delay.actualAt, minutes_late: delay.minutesLate, source: 'STAGE_GATE' },
    });
    const driverName = await records.findDriverName(tx, actor.driverId);
    const notice = {
      type: 'DELAY', title: `Late ${stage.toLowerCase()} on ${job.jobNumber}`,
      body: `${driverName} confirmed the ${stage.toLowerCase()} about ${delay.minutesLate} min late (scheduled ${fmtWhen(delay.scheduledAt)}). Reason: ${reason}`,
      severity: delay.minutesLate >= 60 ? 'HIGH' : 'WARNING',
    };
    await records.audit(tx, {
      organizationId: actor.organizationId, actor: { type: 'DRIVER', driverId: actor.driverId }, action: `${stage}_DELAY_REASON_RECORDED`, entityId: job.id,
      after: { reason, minutes_late: delay.minutesLate },
    });
    return { result: { ...base, alreadyRecorded: false }, events: [{ type: 'trip.delayReported', payload: { jobId: job.id, stage, notice } }], subject: { type: 'JOB', id: job.id } };
  },
});
