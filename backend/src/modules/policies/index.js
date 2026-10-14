/**
 * Policies: the operational rules managers write about actions. A policy is data (a small rule tree), checked against the
 * building blocks the code defines; nothing a manager writes is ever run as code.
 */
require('../../platform/policy/seedProvider').setSeedProvider(require('./seeds').buildPolicySeeds);

module.exports = {
  name: 'policies',
  authorPrompt: require('./author').AUTHOR_PROMPT,
  actions: [
    require('./actions/create'), require('./actions/draft').draftAction, require('./actions/generateFlow').generateFlowAction, require('./actions/revise'), require('./actions/publish'),
    require('./actions/toggle').enable, require('./actions/toggle').disable, require('./actions/archive'), require('./actions/delete'),
  ],
  queries: [require('./queries/list'), require('./queries/catalog'), require('./queries/test'), require('./queries/requirements').requirements],
  checks: require('./checks/unavailable'),
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/policies', query: 'policy.list' },
    { method: 'GET', path: '/policies/capabilities', query: 'policy.catalog' },
    { method: 'GET', path: '/policies/actions', query: 'policy.catalog' },
    { method: 'POST', path: '/policies/test', query: 'policy.test' },
    { method: 'POST', path: '/policies', action: 'policy.create', status: 201 },
    { method: 'POST', path: '/policies/draft', action: 'policy.draft', status: 201, limit: 'ai' },
    { method: 'POST', path: '/policies/:id/generate-flow', action: 'policy.generateFlow', status: 201, params: ['id'], limit: 'ai' },
    { method: 'POST', path: '/policies/:id/publish', action: 'policy.publish', params: ['id'] },
    { method: 'POST', path: '/policies/:id/disable', action: 'policy.disable', params: ['id'] },
    { method: 'POST', path: '/policies/:id/enable', action: 'policy.enable', params: ['id'] },
    { method: 'POST', path: '/policies/:id/revise', action: 'policy.revise', status: 201, params: ['id'] },
    { method: 'POST', path: '/policies/:id/archive', action: 'policy.archive', params: ['id'] },
    { method: 'DELETE', path: '/policies/:id', action: 'policy.delete', params: ['id'] },
    { method: 'GET', path: '/meta/actions/:name/requirements', query: 'policy.requirements', params: ['name'] },
  ],
};
