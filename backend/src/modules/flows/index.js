/**
 * Flows: the driver-facing conversations a manager designs. A flow is data (steps from a fixed vocabulary), checked before it
 * can be published; the engine in interfaces/whatsapp/flows runs the live version.
 */
module.exports = {
  name: 'flows',
  runtime: require('./runtime'),
  vocabulary: require('./vocabulary'),
  generate: require('./generate'),
  authorPrompt: require('./author').AUTHOR_PROMPT,
  actions: [
    require('./actions/create'), require('./actions/draft').draftAction, require('./actions/save'), require('./actions/publish').publish,
    require('./actions/publish').rollback, require('./actions/toggle'), require('./actions/delete'),
  ],
  queries: [require('./queries/list'), require('./queries/get'), require('./queries/simulate'), require('./queries/runtime').listLive, require('./queries/runtime').getVersion],
  checks: [],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/flows', query: 'flow.list' },
    { method: 'POST', path: '/flows/generate', action: 'flow.generate', limit: 'ai' },
    { method: 'POST', path: '/flows', action: 'flow.create', status: 201 },
    { method: 'GET', path: '/flows/:key', query: 'flow.get', params: ['key'] },
    { method: 'PUT', path: '/flows/:key', action: 'flow.save', params: ['key'] },
    { method: 'PATCH', path: '/flows/:key', action: 'flow.toggle', params: ['key'] },
    { method: 'DELETE', path: '/flows/:key', action: 'flow.delete', params: ['key'] },
    { method: 'POST', path: '/flows/:key/publish', action: 'flow.publish', params: ['key'] },
    { method: 'POST', path: '/flows/:key/rollback', action: 'flow.rollback', params: ['key'] },
    { method: 'POST', path: '/flows/:key/simulate', query: 'flow.simulate', params: ['key'] },
  ],
};
