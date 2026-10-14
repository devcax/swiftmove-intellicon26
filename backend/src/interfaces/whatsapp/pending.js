/** What the bot is waiting for in a conversation (a question it asked, a flow in progress). Stored on the conversation. */
const flowEngine = require("./flows/engine");
const repo = require("./repo");

/**
 * Clear the pending action only if it still belongs to the given flow:
 * actions are allowed to replace the pending with a legacy marker or a new
 * flow while running, and those must survive the flow's END step.
 */
const clearFlowPending = (conversationId, flowKey) => repo.clearPendingActionOfFlow(conversationId, flowEngine.PENDING_TYPE, flowKey);

module.exports = {
  getPendingAction: repo.getPendingAction,
  setPendingAction: repo.setPendingAction,
  clearPendingAction: repo.clearPendingAction,
  clearFlowPending,
  isAiPaused: repo.isAiPaused,
};
