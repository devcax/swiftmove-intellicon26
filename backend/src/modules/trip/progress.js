/** What is still outstanding before a started job can move on, in the words the chat uses. */
const { fmtWhen } = require('../../platform/time');
const { stageDelay } = require('./delay');

const START_WINDOW_MS = 24 * 60 * 60 * 1000;

function pendingRequirements(job, assignment) {
  const pending = [];
  if (assignment && assignment.status === 'ASSIGNED') {
    if (job.pickup_at) {
      const earliest = new Date(new Date(job.pickup_at).getTime() - START_WINDOW_MS);
      if (Date.now() < earliest.getTime()) {
        pending.push({ code: 'START_WINDOW', earliestStart: earliest, message: `it can be started from ${fmtWhen(earliest)} (24 hours before the scheduled pickup)` });
      }
    }
    if (job.pickup_verified_at) {
      pending.push({ code: 'START_CONFIRMATION', message: 'the pickup document is verified, but you still need to confirm that you have started the job' });
    }
  }
  const pickup = stageDelay(job, 'PICKUP');
  if (pickup.late && !pickup.reasonRecorded && job.pickup_verified_at) {
    pending.push({ code: 'PICKUP_DELAY_REASON', message: 'the pickup was late and I still need your reason for the delay before the job can be marked as loaded' });
  }
  const delivery = stageDelay(job, 'DELIVERY');
  if (delivery.late && !delivery.reasonRecorded && job.delivery_verified_at) {
    pending.push({ code: 'DELIVERY_DELAY_REASON', message: 'the delivery was late and I still need your reason for the delay before the job can be marked as delivered' });
  }
  return pending;
}

module.exports = { pendingRequirements, START_WINDOW_MS };
