/**
 * A delivered job whose driver never said "close the job" is sent for closure approval after a while, the same request the driver would
 * have made. It does not complete the job: only a manager does. Runs on a timer; with the plugin off, managers close such jobs by hand.
 */
const config = require('../../platform/config');
const runner = require('../../platform/runner');
const driverNotices = require('../../platform/driverNotices');
const { logger } = require('../../platform/logger');
const { defaultOrganizationId } = require('../../platform/defaultOrganization');
const { getPolicySetting } = require('../../platform/policy/store');

const system = (organizationId) => ({ type: 'SYSTEM', organizationId, source: 'TIMER' });

async function sweepOnce() {
  const organizationId = await defaultOrganizationId();
  const setting = await getPolicySetting(organizationId, 'closure.auto-request', { minutes: config.autoClosureDelayMinutes });
  const minutes = Number(setting.minutes) || config.autoClosureDelayMinutes;
  const due = await runner.runQuery('job.dueForClosure', { minutes }, system(organizationId));
  for (const jobId of due) {
    try {
      const { result } = await runner.run('job.requestClosure', { id: jobId }, system(organizationId));
      if (result.alreadyRequested) continue;
      const jobNumber = result.jobNumber ?? null;
      if (result.driver) {
        await driverNotices.notify('notifyDriver', {
          job: result.job ?? { id: jobId, organization_id: organizationId, job_number: jobNumber },
          driver: result.driver,
          body: `The delivery on *${jobNumber ?? 'your job'}* is complete, so I've sent the job to the manager for closure approval. You don't need to do anything else.`,
        });
      }
      logger.info({ jobId }, 'auto-closure: sent for closure approval');
    } catch (err) {
      logger.error({ err, jobId }, 'auto-closure failed for a job');
    }
  }
  return due.length;
}

function register({ timers }) {
  timers.add({ name: 'closure.autoSweep', everyMs: config.autoClosureSweepMs, run: sweepOnce });
}

module.exports = { name: 'autoClosure', register, sweepOnce };
