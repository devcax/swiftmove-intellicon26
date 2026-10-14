/**
 * Summaries: the short running summary of a trip that the AI reads for context. The tables are written only here; the jobSummaries plugin
 * decides when to refresh it and asks the language model for the new text.
 */
module.exports = {
  name: 'summaries',
  actions: [require('./actions/ensure'), require('./actions/save')],
  queries: [require('./queries/state')],
  checks: [],
  events: [],
  routes: [],
};
