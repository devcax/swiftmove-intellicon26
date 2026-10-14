/**
 * Jobs: the loads the organization needs moved. This module owns reading jobs and the changes to the job itself: create, edit,
 * cancel, reopen, reset, ask for closure, send it back for a correction, complete, deactivate, delete. What happens on the road
 * (start, milestones, documents, delays) is the trip module's.
 */
module.exports = {
  name: 'jobs',
  actions: [
    require('./actions/create'), require('./actions/cancel'), require('./actions/publish'), require('./actions/reset'),
    require('./actions/requestClosure'), require('./actions/complete'), require('./actions/requestCorrection'), require('./actions/update'),
    require('./actions/deactivate'), require('./actions/delete'),
  ],
  queries: [
    require('./queries/locationAddress'),
    require('./queries/list'), require('./queries/listLive'), require('./queries/get'), require('./queries/timeline'),
    require('./queries/activity'), require('./queries/nextIdentifiers'), require('./queries/driverReads').findByNumber, require('./queries/driverReads').dueForClosure,
  ],
  checks: [
    require('./checks/jobAcceptingRequests'), require('./checks/jobRankAtLeast'), require('./checks/jobNotFrozen'), require('./checks/deliveryWithinDays'),
  ],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/jobs', query: 'job.list' },
    { method: 'POST', path: '/jobs', action: 'job.create', status: 201 },
    { method: 'GET', path: '/jobs/next-identifiers', query: 'job.nextIdentifiers' },
    { method: 'GET', path: '/jobs/location-address', query: 'job.locationAddress' },
    { method: 'GET', path: '/jobs/live', query: 'job.listLive' },
    { method: 'GET', path: '/jobs/:id', query: 'job.get', params: ['id'] },
    { method: 'GET', path: '/jobs/:id/timeline', query: 'job.timeline', params: ['id'] },
    { method: 'GET', path: '/jobs/:id/activity', query: 'job.activity', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/cancel', action: 'job.cancel', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/activate', action: 'job.publish', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/reset', action: 'job.reset', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/submit-completion', action: 'job.requestClosure', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/complete', action: 'job.complete', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/request-correction', action: 'job.requestCorrection', params: ['id'] },
    { method: 'PATCH', path: '/jobs/:id', action: 'job.update', params: ['id'] },
    { method: 'POST', path: '/jobs/:id/deactivate', action: 'job.deactivate', params: ['id'] },
    { method: 'DELETE', path: '/jobs/:id', action: 'job.delete', params: ['id'] },
  ],
};
