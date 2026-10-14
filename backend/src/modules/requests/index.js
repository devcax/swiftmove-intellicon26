/**
 * Requests and offers: how a driver ends up with a job. A driver asks for an open job (or is offered one), a manager decides, and
 * the driver accepts or declines. The trip itself starts in the trip module.
 */
module.exports = {
  name: 'requests',
  vehicleMatch: require('./vehicleMatch'),
  actions: [
    require('./actions/submit'), require('./actions/withdraw'), require('./actions/approve'), require('./actions/reject'),
    require('./actions/sendOffer'), require('./actions/acceptOffer'), require('./actions/declineOffer'),
  ],
  queries: [require('./queries/list'), require('./queries/history'), require('./queries/driverReads').available, require('./queries/driverReads').pending, require('./queries/offerCandidates')],
  checks: [require('./checks/driverAvailable'), require('./checks/driverStatusIs'), require('./checks/driverNotReleased'), require('./checks/pickupWithinHours')],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/job-requests', query: 'request.list' },
    { method: 'GET', path: '/job-requests/history', query: 'request.history' },
    { method: 'POST', path: '/job-requests/:id/approve', action: 'request.approve', params: ['id'] },
    { method: 'POST', path: '/job-requests/:id/reject', action: 'request.reject', params: ['id'] },
  ],
};
