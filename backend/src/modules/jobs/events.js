const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');
const { notice } = require('../../platform/notice');

module.exports = [
  defineEvent({
    name: 'job.published', description: 'A job is open for drivers: it was created published, published, reactivated, reset, or its driver was released and nobody else asked.',
    payload: z.object({ jobId: z.guid(), jobNumber: z.string() }),
  }),
  defineEvent({
    name: 'job.changed', description: 'A job was created, cancelled, reset, reopened, sent for closure or completed.',
    payload: z.object({ jobId: z.guid(), jobNumber: z.string(), status: z.string(), change: z.string() }),
  }),
  defineEvent({
    name: 'closure.requested', description: 'Closing a delivered job was asked for: by the driver, by the timer, or by a manager sending it to review.',
    payload: z.object({ jobId: z.guid(), source: z.enum(['DRIVER', 'SYSTEM', 'MANAGER']), status: z.string(), notice: notice.optional() }),
  }),
];
