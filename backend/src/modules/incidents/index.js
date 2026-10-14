/**
 * Incidents: problems drivers report on a job (accident, breakdown, damage, ...) and what managers do about them.
 */
const review = require('./actions/review');

module.exports = {
  name: 'incidents',
  actions: [
    require('./actions/report'), review.resolve, review.markUnderReview, review.keepOpen, require('./actions/saveNotes'), require('./actions/recordSafetyFollowup'),
  ],
  queries: [require('./queries/list'), require('./queries/get')],
  checks: [require('./checks/noDuplicateOpenIncident'), require('./checks/safetyFollowupRecorded')],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/incidents', query: 'incident.list' },
    { method: 'GET', path: '/incidents/:id', query: 'incident.get', params: ['id'] },
    { method: 'PATCH', path: '/incidents/:id', action: 'incident.saveNotes', params: ['id'] },
    { method: 'POST', path: '/incidents/:id/resolve', action: 'incident.resolve', params: ['id'] },
    { method: 'POST', path: '/incidents/:id/under-review', action: 'incident.markUnderReview', params: ['id'] },
    { method: 'POST', path: '/incidents/:id/keep-open', action: 'incident.keepOpen', params: ['id'] },
  ],
};
