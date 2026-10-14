const { defineQuery } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { ID_SHAPE } = require('../../../platform/http/ownership');
const { idSchema } = require('../schemas');
const { toMessages } = require('../present');
const { NOT_FOUND } = require('../load');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'conversation.messages',
  description: 'The messages of a conversation, oldest first (at most 500), with what the AI understood and the attachments.',
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  handler: async ({ input, actor, db }) => {
    if (!ID_SHAPE.test(input.id) || !(await repo.exists(db, actor.organizationId, input.id))) throw new NotFoundError(NOT_FOUND);
    const [messages, attachments] = await Promise.all([repo.listMessages(db, input.id), repo.listAttachments(db, input.id)]);
    return toMessages(messages, attachments);
  },
});
