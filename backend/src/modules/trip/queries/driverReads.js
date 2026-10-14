const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const sm = require('../../../platform/jobStateMachine');
const { pendingRequirements } = require('../progress');
const repo = require('../repo');

// These reads answer the driver's own questions on WhatsApp ("where am I on this job?"). A driver reads only their own trip;
// the system may name the driver.
const driverIdOf = (input, actor) => {
  const id = actor.type === 'DRIVER' ? actor.driverId : input.driverId;
  if (!id) throw new ValidationError('driverId is required.');
  return id;
};
const driverInput = z.object({ driverId: z.guid().optional() });
const common = { actors: ['DRIVER', 'SYSTEM'], roles: [] };

const assignment = defineQuery({
  ...common, name: 'trip.assignment', description: 'The driver\'s one live assignment (offered, assigned, started or in cancellation review), or nothing.',
  input: driverInput, handler: async ({ input, actor, db }) => repo.findDriverAssignment(db, driverIdOf(input, actor)),
});

const progress = defineQuery({
  ...common, name: 'trip.progress', input: driverInput,
  description: 'Where the driver is on their job: the stage, what to do next, what is verified, and what is still outstanding. Falls back to the last job when none is live.',
  handler: async ({ input, actor, db }) => {
    const driverId = driverIdOf(input, actor);
    const live = await repo.findDriverAssignment(db, driverId);
    const job = live ? await repo.findJobRow(db, live.job_id) : await repo.findLatestJobOfDriver(db, driverId);
    if (!job) return null;
    return {
      job, ...(live ? { assignment: live } : {}), stage: job.current_status, label: sm.label(job.current_status), nextStep: sm.nextStepHint(job.current_status),
      verifiedPickup: Boolean(job.pickup_verified_at), verifiedDelivery: Boolean(job.delivery_verified_at),
      pending: live ? pendingRequirements(job, live) : [], live: Boolean(live),
    };
  },
});

const recentJobs = defineQuery({
  ...common, name: 'trip.recentJobs', description: 'The driver\'s most recent jobs, for "which job is this document for?".',
  input: z.object({ driverId: z.guid().optional(), limit: z.number().int().min(1).max(20).default(5) }),
  handler: async ({ input, actor, db }) => repo.listRecentJobs(db, driverIdOf(input, actor), input.limit),
});

const hasProofOfDelivery = defineQuery({
  ...common, name: 'trip.hasProofOfDelivery', description: 'Whether a proof-of-delivery document was received for the job.',
  input: z.object({ jobId: z.guid() }), handler: async ({ input, db }) => repo.hasProofOfDelivery(db, input.jobId),
});

module.exports = { assignment, progress, recentJobs, hasProofOfDelivery };
