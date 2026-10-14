const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { lockJob } = require('../load');
const closure = require('../closure');

const schema = z.object({ id: z.string().min(1).max(64).optional(), messageId: z.guid().nullish(), confidence: z.number().nullish() });

/**
 * A driver finishing their trip, the timer closing a delivered job nobody closed, or a manager sending a delivered job to review.
 * Policies written for END_JOB (the driver's) and AUTO_CLOSE_JOB (the timer's) apply to the matching actor.
 */
module.exports = defineAction({
  name: 'job.requestClosure',
  title: 'Send a job for closure review',
  description: 'Ask for a delivered job to be closed: a driver says they are done, the timer does it for an idle delivered job, or a manager sends it to review.',
  actors: ['DRIVER', 'SYSTEM', 'MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: schema,
  load: (args) => {
    if (args.actor.type === 'DRIVER') return closure.loadForDriver(args);
    if (args.actor.type === 'SYSTEM') return closure.loadForSystem(args);
    return lockJob(args);
  },
  handler: (args) => {
    if (args.actor.type === 'DRIVER') return closure.runForDriver(args);
    if (args.actor.type === 'SYSTEM') return closure.runForSystem(args);
    return closure.runForManager(args);
  },
});
