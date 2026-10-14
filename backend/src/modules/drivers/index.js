/** The drivers module: who drives for the organization. */
module.exports = {
  name: 'drivers',
  actions: [
    require('./actions/create'), require('./actions/update'), require('./actions/updateStatus'), require('./actions/delete'), require('./actions/recordWhatsappActivity'),
  ],
  queries: [require('./queries/list'), require('./queries/get'), require('./queries/profile')],
  checks: [],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/drivers', query: 'driver.list' },
    { method: 'GET', path: '/drivers/:id/profile', query: 'driver.profile', params: ['id'] },
    { method: 'GET', path: '/drivers/:id', query: 'driver.get', params: ['id'] },
    { method: 'POST', path: '/drivers', action: 'driver.create' },
    { method: 'PATCH', path: '/drivers/:id/status', action: 'driver.updateStatus', params: ['id'] },
    { method: 'PATCH', path: '/drivers/:id', action: 'driver.update', params: ['id'] },
    { method: 'DELETE', path: '/drivers/:id', action: 'driver.delete', params: ['id'] },
  ],
};
