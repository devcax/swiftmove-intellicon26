/**
 * AI instructions: the editable prompts behind each AI feature. Each has a default compiled into the code; saving stores an
 * organization override and resetting removes it, so the bot always has a prompt to fall back to.
 */
module.exports = {
  name: 'aiInstructions',
  prompts: require('./prompts'),
  actions: [require('./actions/update'), require('./actions/reset')],
  queries: [require('./queries/list')],
  checks: [],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/ai-instructions', query: 'aiInstruction.list' },
    { method: 'PATCH', path: '/ai-instructions/:key', action: 'aiInstruction.update', params: ['key'] },
    { method: 'POST', path: '/ai-instructions/:key/reset', action: 'aiInstruction.reset', params: ['key'] },
  ],
};
