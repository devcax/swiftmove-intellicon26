/**
 * A late pickup or delivery that a manager verified by hand never went through the driver's conversation, so nobody asked why it was
 * late. This asks the driver. (When the driver's own photo verifies a late stage, the conversation asks on the spot and does not wait for
 * an event.) Asking is skipped when the stage was on time, the reason is already on record, or the driver has no WhatsApp number.
 */
const driverNotices = require('../../platform/driverNotices');

async function askForReason({ event, query }) {
  const { jobId, stage, method } = event.payload;
  if (method !== 'MANAGER_MANUAL') return { skipped: 'DRIVER_WAS_ASKED_IN_CHAT' };
  let delay;
  try {
    delay = await query('trip.stageDelay', { jobId, stage });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return { skipped: 'NO_JOB' };
    throw err;
  }
  if (!delay.late || delay.reasonRecorded) return { skipped: 'NOTHING_TO_ASK' };
  if (!delay.driver?.phone_e164) return { skipped: 'NO_DRIVER_CONTACT' };
  await driverNotices.notify('askDelayReason', {
    job: delay.job, driver: delay.driver, stage, minutesLate: delay.minutesLate, scheduledAt: delay.scheduledAt, eventId: event.id,
  });
  return { asked: true };
}

function register({ subscribe }) {
  subscribe('document.verified', 'delayReasons.ask', askForReason);
}

module.exports = { name: 'delayReasons', register, askForReason };
