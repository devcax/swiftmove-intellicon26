const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { loadDriverTrip } = require('../load');
const repo = require('../repo');

const schema = z.object({
  data: z.record(z.string(), z.unknown()).default({}), messageId: z.guid().nullish(), confidence: z.number().nullish(),
});

module.exports = defineAction({
  name: 'trip.reportDelay',
  title: 'Report a delay',
  description: 'A driver on a started job says they are running late. The job is marked delayed and the managers are told.',
  actors: ['DRIVER'],
  input: schema,
  load: (args) => loadDriverTrip(args, { statuses: ['ACTIVE'], message: 'No started job — delays can only be reported on a started job' }),
  handler: async ({ input, actor, tx, subject }) => {
    const { data } = input;
    const job = await records.findJob(tx, actor.organizationId, subject.jobId);
    await records.recordEvent(tx, { jobId: job.id, assignmentId: subject.assignment.id, messageId: input.messageId, eventType: 'DELAY_REPORTED', data, confidence: input.confidence });

    const stage = ['PICKUP', 'DELIVERY'].includes(data.stage) ? data.stage : null;
    if (stage) {
      const column = stage === 'PICKUP' ? 'pickupDelayReason' : 'deliveryDelayReason';
      if (!job[column]) await repo.updateJobColumns(tx, job.id, { [column]: String(data.reason ?? 'Delay reported').trim().slice(0, 500) });
    }
    await records.setStatus(tx, job, 'DELAYED', { type: 'DRIVER', driverId: actor.driverId });
    const minutes = Number(data.delay_minutes) || 0;
    const driverName = await records.findDriverName(tx, actor.driverId);
    const notice = {
      type: 'DELAY', title: `${job.jobNumber} delayed`,
      body: `${driverName}: ${data.reason ?? 'delay reported'}${minutes ? ` (~${minutes} min)` : ''}`, severity: minutes >= 60 ? 'HIGH' : 'WARNING',
    };
    return { result: { jobId: job.id, assignmentId: subject.assignment.id }, events: [{ type: 'trip.delayReported', payload: { jobId: job.id, stage, notice } }], subject: { type: 'JOB', id: job.id } };
  },
});
