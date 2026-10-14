const { defineAction } = require('../../../platform/registry');
const { ConflictError } = require('../../../platform/errors');
const { createSchema } = require('../schemas');
const { newPolicyPayload, slugify } = require('../payload');
const { assertValidPayload } = require('../validate');
const { changed } = require('../load');
const repo = require('../repo');

const conflict = (key) => new ConflictError(`A policy with key "${key}" already exists — revise it instead.`);

module.exports = defineAction({
  name: 'policy.create',
  title: 'Create a policy draft',
  description: 'Write a new rule as a draft. It does nothing until it is published.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: createSchema,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const key = input.key != null ? String(input.key).trim() : await repo.allocateKey(tx, organizationId, slugify(input.name));
    const payload = newPolicyPayload(input, key);
    assertValidPayload(payload);
    if (await repo.keyExists(tx, organizationId, payload.key)) throw conflict(payload.key);

    let row;
    try {
      row = await repo.insertDraft(tx, organizationId, { ...payload, sourceInstruction: input.sourceInstruction, createdByUserId: actor.userId });
    } catch (err) {
      if (err.code === 'P2002') throw conflict(payload.key);
      throw err;
    }
    await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: 'POLICY_CREATED', entityId: row.id, after: { ...payload, status: 'DRAFT' } });
    return { result: row, events: [changed(row, 'created')], subject: { type: 'POLICY', id: row.id } };
  },
});
