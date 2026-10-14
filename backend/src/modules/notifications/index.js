/**
 * Notifications: a reusable transactional engine and per-user inbox. Currently the inbox receives driver messages and incidents.
 * Other operational plugins can still raise their legacy manager notices through alertManagers.
 */
module.exports = {
  name: 'notifications',
  actions: [require('./actions/alertManagers'), require('./actions/markRead')],
  queries: [require('./queries/inbox')],
  checks: [],
  events: [],
  routes: [
    { method: 'GET', path: '/notifications', query: 'notification.inbox' },
    { method: 'POST', path: '/notifications/read', action: 'notification.markRead' },
  ],
};
