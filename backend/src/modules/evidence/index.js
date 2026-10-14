/** Evidence: proof that something happened, recorded against a driver or a job, usable by any policy. */
module.exports = {
  createUploadRouter: require('./routes').createUploadRouter,
  name: 'evidence',
  actions: [require('./actions/record'), require('./actions/revoke'), require('./actions/purgePending')],
  queries: [require('./queries/list')],
  checks: [require('./checks/evidenceRecorded'), require('./checks/managerApproved')],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/evidence', query: 'evidence.list' },
    { method: 'POST', path: '/evidence', action: 'evidence.record', status: 201 },
    { method: 'POST', path: '/evidence/:id/revoke', action: 'evidence.revoke', params: ['id'] },
  ],
};
