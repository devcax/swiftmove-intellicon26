const { defineQuery } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { ID_SHAPE } = require('../../../platform/http/ownership');
const { idSchema } = require('../schemas');
const { toConversationDetail } = require('../present');
const { NOT_FOUND } = require('../load');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'conversation.get',
  description: 'One conversation\'s header: the driver, their number, the job and whether the AI is paused.',
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  handler: async ({ input, actor, db }) => {
    const row = ID_SHAPE.test(input.id) ? await repo.findHeader(db, actor.organizationId, input.id) : null;
    if (!row) throw new NotFoundError(NOT_FOUND);
    return toConversationDetail(row);
  },
});
