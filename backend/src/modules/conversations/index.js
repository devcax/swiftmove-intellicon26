/**
 * Conversations: the WhatsApp conversations the dashboard shows. Managers read them, mark them read, take them over from the AI,
 * write to the driver, clear or delete them. What the driver and the bot say to each other is the WhatsApp interface's.
 */
module.exports = {
  name: 'conversations',
  actions: [
    require('./actions/sendManagerMessage').sendAction, require('./actions/markRead'), require('./actions/setAiTakeover'), require('./actions/clear'), require('./actions/delete'), require('./actions/noteMessageHandled'), ...require('./targets'),
  ],
  queries: [require('./queries/list'), require('./queries/get'), require('./queries/messages')],
  checks: [],
  events: require('./events'),
  routes: [
    { method: 'GET', path: '/conversations', query: 'conversation.list' },
    { method: 'POST', path: '/conversations/:id/read', action: 'conversation.markRead', params: ['id'] },
    { method: 'GET', path: '/conversations/:id', query: 'conversation.get', params: ['id'] },
    { method: 'POST', path: '/conversations/:id/takeover', action: 'conversation.setAiTakeover', params: ['id'] },
    { method: 'GET', path: '/conversations/:id/messages', query: 'conversation.messages', params: ['id'] },
    { method: 'DELETE', path: '/conversations/:id/messages', action: 'conversation.clear', params: ['id'] },
    { method: 'DELETE', path: '/conversations/:id', action: 'conversation.delete', params: ['id'] },
    { method: 'POST', path: '/conversations/:id/messages', action: 'conversation.sendManagerMessage', status: 201, params: ['id'] },
  ],
};
