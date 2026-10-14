const { NotFoundError } = require('../../platform/errors');
const { ID_SHAPE } = require('../../platform/http/ownership');
const { lockRow } = require('../../platform/db');

const NOT_FOUND = 'Conversation not found';

/** Lock the conversation for this transaction. One of another organization is reported as missing. */
async function lockConversation({ input, actor, tx }) {
  if (!ID_SHAPE.test(input.id) || !(await lockRow(tx, 'conversations', input.id, actor.organizationId))) throw new NotFoundError(NOT_FOUND);
  return { subject: { type: 'CONVERSATION', id: input.id } };
}

const changed = (id, change) => ({ type: 'conversation.changed', payload: { conversationId: id, change } });

module.exports = { lockConversation, changed, NOT_FOUND };
