/**
 * Trip: what happens to a job once a driver has it. The driver starts it, reports milestones and sends documents (verified by their
 * security codes), reports delays, may ask to cancel; managers verify documents by hand, decide on cancellations and release drivers.
 * The state machine (platform/jobStateMachine.js) holds the rules of which move is legal and what it implies.
 */
const reads = require('./queries/driverReads');

module.exports = {
  name: 'trip',
  stateMachine: require('../../platform/jobStateMachine'),
  documentCodes: require('./documentCodes'),
  actions: [
    require('./actions/start'), require('./actions/milestone'), require('./actions/reportProofPending'), require('./actions/attachDocument'), require('./actions/verifyDocument'),
    require('./actions/verifyByManager'), require('./actions/applyPendingVerifications'), require('./actions/recordDelayReason'), require('./actions/reportDelay'),
    require('./actions/requestCancellation'), require('./actions/resolveCancellation'), require('./actions/releaseDriver'), require('./actions/recordDocumentIssue'),
  ],
  queries: [reads.assignment, reads.progress, reads.recentJobs, reads.hasProofOfDelivery, require('./queries/stageDelay')],
  checks: [
    require('./checks/startedWithinHoursOfPickup'), require('./checks/documentGatesRespected'), require('./checks/tripStartedExplicit'),
    require('./checks/notReversingProtected'), require('./checks/documentVerified'), require('./checks/documentAttached'),
  ],
  events: require('./events'),
  routes: [
    { method: 'POST', path: '/jobs/:id/verify', action: 'trip.verifyByManager', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/cancellation-decision', action: 'trip.resolveCancellation', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/release-driver', action: 'trip.releaseDriver', params: ['id'] },
  ],
};
