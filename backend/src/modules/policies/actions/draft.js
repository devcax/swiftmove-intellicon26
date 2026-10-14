const { defineAction } = require('../../../platform/registry');
const { AppError, NotFoundError, ValidationError } = require('../../../platform/errors');
const { validatePolicy } = require('../../../platform/policy/dsl');
const { draftPolicy } = require('../author');
const { draftSchema } = require('../schemas');
const { validationFailure } = require('../validate');
const { changed } = require('../load');
const repo = require('../repo');

const UNUSABLE = 'The AI could not turn that into a valid rule with the supported capabilities. Rephrase it or build the rule manually.';

/**
 * Turn a plain-words instruction into a draft with the AI author. The AI call happens in `prepare`, before the transaction
 * opens (an LLM call must never hold a transaction); the handler only saves what came back, after the backend has validated
 * it independently of the model.
 */
function createDraftAction({ draft = draftPolicy, db = repo.client } = {}) {
  return defineAction({
    name: 'policy.draft',
    title: 'Draft a policy with the AI',
    description: 'Create a new policy (rule) from plain words: describe it and the AI writes it from the supported building blocks. It is saved as a draft only and does nothing until it is published.',
    actors: ['MANAGER'],
    roles: ['ADMIN', 'MANAGER'],
    input: draftSchema,
    prepare: async ({ input, actor }) => {
      const instruction = input.instruction.trim();
      if (!instruction) throw new ValidationError('Describe the rule in plain words first.');
      let base = null;
      if (input.base?.id) {
        const row = await repo.findPolicy(db, actor.organizationId, input.base.id);
        if (!row) throw new NotFoundError('Base policy not found.');
        base = { name: row.name, description: row.description, action: row.action, match: row.match, rule: row.rule, onBlock: row.onBlock };
      } else if (input.base?.rule) {
        base = input.base;
      }

      const result = await draft({ instruction, base, organizationId: actor.organizationId });
      if (!result.ok) {
        throw new AppError(UNUSABLE, { code: 'POLICY_DRAFT_FAILED', status: 422, expose: true, extra: { issues: result.issues, unsupported: result.unsupported } });
      }
      const check = validatePolicy(result.draft);
      if (!check.ok) throw validationFailure(check.errors, { unsupported: result.unsupported }, 422);
      return { instruction, result };
    },
    handler: async ({ actor, tx, prepared }) => {
      const { instruction, result } = prepared;
      const organizationId = actor.organizationId;
      const key = await repo.allocateKey(tx, organizationId, result.suggestedKey);
      const row = await repo.insertDraft(tx, organizationId, {
        key, name: result.draft.name, description: result.draft.description, action: result.draft.action, enforcement: 'GATEWAY',
        match: result.draft.match, rule: result.draft.rule, onBlock: result.draft.onBlock, position: 100,
        sourceInstruction: instruction, createdByUserId: actor.userId,
      });
      await repo.audit(tx, {
        organizationId, actorUserId: actor.userId, action: 'POLICY_DRAFTED', entityId: row.id,
        after: { key, version: 1, instruction, draft: result.draft, unsupported: result.unsupported },
      });
      return {
        result: { policy: row, unsupported: result.unsupported, attempts: result.attempts },
        events: [changed(row, 'drafted')], subject: { type: 'POLICY', id: row.id },
      };
    },
  });
}

module.exports = { draftAction: createDraftAction(), createDraftAction };
