/**
 * Stats: the numbers on the dashboard (the sidebar badges and the operations overview). Read-only: it changes nothing.
 */
module.exports = {
  name: 'stats',
  actions: [],
  queries: [require('./queries/overview'), require('./queries/sidebarCounts'), require('./queries/notifications')],
  checks: [],
  events: [],
  routes: [
    { method: 'GET', path: '/stats/sidebar-counts', query: 'stats.sidebarCounts' },
    { method: 'GET', path: '/stats/sidebar-notifications', query: 'stats.notifications' },
    { method: 'GET', path: '/stats/overview', query: 'stats.overview' },
  ],
};
