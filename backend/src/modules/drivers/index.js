/** The drivers module: who drives for the organization. */
module.exports = {
  name: 'drivers',
  actions: [
    require('./actions/create'), require('./actions/update'), require('./actions/updateStatus'), require('./actions/delete'), require('./actions/recordWhatsappActivity'),
    require('./actions/resendActivation'), require('./actions/activate'),
  ],
  queries: [require('./queries/activationLink'), require('./queries/activationLookup'), require('./queries/list'), require('./queries/get'), require('./queries/profile')],
  checks: [],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/drivers', query: 'driver.list' },
    { method: 'GET', path: '/drivers/:id/profile', query: 'driver.profile', params: ['id'] },
    { method: 'GET', path: '/drivers/:id', query: 'driver.get', params: ['id'] },
    { method: 'POST', path: '/drivers', action: 'driver.create' },
    { method: 'POST', path: '/drivers/:id/activation', action: 'driver.resendActivation', params: ['id'] },
    { method: 'PATCH', path: '/drivers/:id/status', action: 'driver.updateStatus', params: ['id'] },
    { method: 'PATCH', path: '/drivers/:id', action: 'driver.update', params: ['id'] },
    { method: 'DELETE', path: '/drivers/:id', action: 'driver.delete', params: ['id'] },
  ],
};
