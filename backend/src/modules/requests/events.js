const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');
const { notice } = require('../../platform/notice');

const request = z.object({ requestId: z.guid(), jobId: z.guid(), driverId: z.guid(), notice: notice.optional() });
const offer = z.object({ jobId: z.guid(), driverId: z.guid(), assignmentId: z.guid().nullable(), notice: notice.optional() });

module.exports = [
  defineEvent({ name: 'request.submitted', description: 'A driver asked for a job.', payload: request }),
  defineEvent({ name: 'request.withdrawn', description: 'A driver withdrew their request before a decision.', payload: request }),
  defineEvent({ name: 'request.approved', description: 'A manager approved a driver\'s request; the driver was offered the job.', payload: request }),
  defineEvent({ name: 'request.rejected', description: 'A manager rejected a driver\'s request.', payload: request }),
  defineEvent({ name: 'offer.sent', description: 'A driver was offered a job by the system.', payload: offer }),
  defineEvent({ name: 'offer.accepted', description: 'A driver accepted the offered job and is now assigned.', payload: offer }),
  defineEvent({ name: 'offer.declined', description: 'A driver declined the offered job.', payload: offer }),
];
