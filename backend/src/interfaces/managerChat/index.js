/**
 * The manager chat: the way a manager operates the system by writing to an assistant. It holds no business rules. The assistant's tools
 * are the registry's actions and queries, run through the same runner and policies as the dashboard, as the signed-in manager.
 */
module.exports = { createManagerChatRouter: require('./routes').createManagerChatRouter, createEngine: require('./engine').createEngine };
