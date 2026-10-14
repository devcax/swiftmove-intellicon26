const { defineAction } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { lockJob, changed, tellDriverAfterCommit } = require('../load');
const changes = require('../changes');
const repo = require('../repo');

module.exports = defineAction({
  name: 'job.delete',
  title: 'Delete a job',
  description: 'Permanently remove a job with its requests, assignments, events, incidents and notifications. Current drivers are told after deletion succeeds. Conversations stay, detached from the job. This cannot be undone.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  destructive: true,
  input: idSchema,
  load: lockJob,
  handler: async ({ input, actor, tx }) => {
    const job = await changes.findJob(tx, actor.organizationId, input.id);
    const drivers = await repo.listDeletionRecipients(tx, actor.organizationId, job.id);
    await repo.deleteJobCascade(tx, job.id);
    const snapshot = { id: job.id, job_number: job.jobNumber, organization_id: job.organizationId };
    return {
      result: { ok: true, id: job.id, jobNumber: job.jobNumber }, events: [changed(job, 'deleted')], subject: { type: 'JOB', id: job.id },
      afterCommit: drivers.map(driver => tellDriverAfterCommit('sendJobDeleted', { job: snapshot, driver })),
    };
  },
});
