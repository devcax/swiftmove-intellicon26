/**
 * When a job is open for drivers, find the drivers whose vehicle suits the cargo and invite them to apply. The invite is an offer to ask,
 * not an assignment: a manager still approves from the Requests queue.
 */
const driverNotices = require('../../platform/driverNotices');
const { logger } = require('../../platform/logger');
const { getPolicyParams } = require('../../platform/policy/store');
const { vehicleMatch } = require('../../modules/requests');

async function inviteMatchingDrivers({ event, run, query }) {
  const { jobId } = event.payload;
  let found;
  try {
    found = await query('request.offerCandidates', { jobId });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return { skipped: 'NO_JOB' };
    throw err;
  }
  const { job, items, candidates } = found;
  if (job.current_status !== 'PUBLISHED') return { skipped: 'NOT_PUBLISHED' };

  const pickupAt = new Date(job.pickup_at).getTime();
  const now = Date.now();
  const window = await getPolicyParams(job.organization_id, 'job.request-eligibility', 'pickup_within_hours', { hours: 24 });
  const hours = Number(window.hours) || 24;
  if (!Number.isFinite(pickupAt) || pickupAt < now || pickupAt >= now + hours * 3600 * 1000) return { skipped: 'OUTSIDE_REQUEST_WINDOW' };
  if (candidates.length === 0) return { skipped: 'NO_CANDIDATES' };

  const matches = await vehicleMatch.matchDriversForJob({ job, items, drivers: candidates });
  const invited = [];
  for (const match of matches) {
    const driver = candidates.find((c) => c.id === match.driver_id);
    if (!driver) continue;
    try {
      await driverNotices.notify('sendJobApplyInvite', { job, driver, match });
      invited.push(`${driver.name} (${driver.vehicle_type}${match.fit === 'tight' ? ', tight fit' : ''})`);
    } catch (err) {
      logger.error({ err, driverId: driver.id, jobId }, 'Invite to a matched driver failed');
    }
  }
  if (invited.length > 0) {
    // After the invites: if this fails the event is not retried for it, because that would invite the same drivers twice.
    try {
      await run('notification.alertManagers', {
        jobId: job.id, type: 'JOB_OFFERS_SENT', severity: 'INFO', eventId: event.id,
        title: `${job.job_number} sent to ${invited.length} matched driver${invited.length === 1 ? '' : 's'}`,
        body: `Vehicle match on publish: ${invited.join(', ')}. They were invited to apply; approve from the Requests queue.`,
      });
    } catch (err) {
      logger.error({ err, jobId }, 'Could not tell the managers about the invites');
    }
  }
  return { invited: invited.length, matched: matches.length, candidates: candidates.length };
}

function register({ subscribe }) {
  subscribe('job.published', 'driverMatching.invite', inviteMatchingDrivers);
}

module.exports = { name: 'driverMatching', register, inviteMatchingDrivers };
