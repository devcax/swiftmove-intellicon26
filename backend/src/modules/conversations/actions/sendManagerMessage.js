const { defineAction } = require('../../../platform/registry');
const { NotFoundError, ValidationError, AppError } = require('../../../platform/errors');
const { logger } = require('../../../platform/logger');
const outbound = require('../../../platform/outbound');
const { sendSchema } = require('../schemas');
const { lockConversation, changed, NOT_FOUND } = require('../load');
const repo = require('../repo');

/**
 * A manager writes to the driver from the dashboard. The message is stored first; the WhatsApp send happens once it is saved (never
 * inside the transaction), and updates the row to SENT or FAILED. A failed send keeps the stored message and is reported to the caller
 * as a 502, as before.
 */
function createSendAction({ send = outbound.sendText, db = repo.client } = {}) {
  return defineAction({
    name: 'conversation.sendManagerMessage',
    title: 'Send a message to a driver',
    description: 'Write to the driver on WhatsApp as the manager. The message is signed "Manager" and shown in the conversation.',
    actors: ['MANAGER'],
    roles: ['ADMIN', 'MANAGER'],
    input: sendSchema,
    // The conversation is found, and the text and the driver's number checked, in the order the dashboard has always seen them.
    prepare: async ({ input, actor }) => {
      if (!(await repo.exists(db, actor.organizationId, String(input.id)))) throw new NotFoundError(NOT_FOUND);
      const body = String(input.body ?? '').trim();
      if (!body) throw new ValidationError('body is required');
      const target = await repo.findSendTarget(db, actor.organizationId, input.id);
      if (!target) throw new NotFoundError('Conversation or driver WhatsApp account not found');
      return { body, phone: target.phone_e164 };
    },
    load: lockConversation,
    handler: async ({ input, tx, prepared }) => {
      const message = await repo.insertManagerMessage(tx, input.id, prepared.body);
      const result = { id: message.id, kind: 'MANAGER', text: prepared.body, time: message.createdAt, deliveryStatus: 'QUEUED' };
      const deliver = async () => {
        try {
          const wamid = await send(prepared.phone, `${prepared.body}\n\n_Manager_`);
          await repo.markMessageSent(db, message.id, wamid);
          await repo.touchLastMessage(db, input.id);
          result.deliveryStatus = 'SENT'; // the caller reads this object once the send is done
        } catch (err) {
          await repo.markMessageFailed(db, message.id).catch(() => {});
          logger.error({ err }, 'Outbound send failed');
          throw Object.assign(new AppError('Message stored but WhatsApp delivery failed', {
            code: 'EXTERNAL_SERVICE_FAILED', status: 502, expose: true, extra: { detail: err.message, messageId: message.id },
          }), { reportToCaller: true });
        }
      };
      return { result, events: [changed(input.id, 'message_sent')], subject: { type: 'CONVERSATION', id: input.id }, afterCommit: [deliver] };
    },
  });
}

module.exports = { sendAction: createSendAction(), createSendAction };
