/**
 * The notice the action wrote into its event ("Sunil requested JOB-12") becomes a notice on the managers' dashboard. Raised through the
 * notification.alertManagers action with the event id, so the same event delivered twice raises it once.
 */
async function managerNotice({ event, run }) {
  const { notice, jobId } = event.payload;
  if (!notice) return;
  try {
    await run('notification.alertManagers', {
    type: notice.type, title: notice.title, body: notice.body, severity: notice.severity, jobId: jobId ?? null, incidentId: notice.incidentId ?? null, eventId: event.id,
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return; // the job was deleted before the notice was delivered: nothing left to tell
    throw err;
  }
}

/** Every event that carries a notice for the managers. */
const NOTICE_EVENTS = [
  'request.submitted', 'offer.declined', 'closure.requested', 'trip.delayReported', 'trip.cancellationRequested',
  'document.verified', 'document.rejected',
];

module.exports = { managerNotice, NOTICE_EVENTS };
