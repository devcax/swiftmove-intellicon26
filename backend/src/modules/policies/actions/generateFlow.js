const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { AppError, ConflictError, NotFoundError, ValidationError } = require('../../../platform/errors');
const { generate } = require('../../flows');
const { buildBrief, coverageIssues } = require('../flowBrief');
const { assertValidPayload } = require('../validate');
const { lockPolicy, changed } = require('../load');
const { revisionPayload } = require('../payload');
const repo = require('../repo');

const flowKeyOf = (policyKey) => `policy.${policyKey}`;

/**
 * Write the conversation that satisfies a policy, with the AI flow author, and link it: the flow is saved as a draft (key `policy.<key>`),
 * and the policy gets a draft revision whose block starts that flow. Nothing is published; a manager reviews both and publishes them.
 * The AI call is made in `prepare`, before the transaction opens.
 */
function createGenerateFlowAction({ generateDefinition = (args) => generate.generateDefinition(args), db = repo.client } = {}) {
  return defineAction({
    name: 'policy.generateFlow',
    title: 'Generate the conversation for a policy',
    description: 'Write, with the AI, the WhatsApp conversation that collects what a policy asks for, then save it as a draft linked to a draft revision of the policy. Nothing is published.',
    actors: ['MANAGER'],
    roles: ['ADMIN'],
    input: z.object({ id: z.guid() }),
    prepare: async ({ input, actor }) => {
      const policy = await repo.findPolicy(db, actor.organizationId, input.id);
      if (!policy) throw new NotFoundError('Policy not found.');
      if (policy.enforcement !== 'GATEWAY') throw new ValidationError('Only a rule that blocks an action can have a conversation.');
      const brief = buildBrief(policy);
      let result;
      try {
        result = await generateDefinition({
          description: brief.text, organizationId: actor.organizationId, extraValidate: (definition) => coverageIssues(definition, brief.collect),
        });
      } catch (cause) {
        throw new AppError('The AI author is unavailable right now. Try again in a moment.', { code: 'EXTERNAL_SERVICE_FAILED', status: 502, expose: true, cause });
      }
      if (!result.ok) {
        throw new ValidationError('The AI draft did not pass validation. Try again, or write the conversation by hand.', {
          status: 422, details: result.issues.map((message) => ({ path: null, message })), extra: { issues: result.issues },
        });
      }
      return { policy, result, brief };
    },
    load: lockPolicy,
    handler: async ({ actor, tx, prepared }) => {
      const organizationId = actor.organizationId;
      const { policy, result, brief } = prepared;
      const base = await repo.findPolicy(tx, organizationId, policy.id);
      if (!base) throw new NotFoundError('Policy not found.');
      if (base.status === 'ARCHIVED') throw new ConflictError('An archived policy cannot be changed.');
      const flowKey = flowKeyOf(base.key);

      const flow = await generate.saveGeneratedDraft(tx, {
        organizationId, actorUserId: actor.userId, key: flowKey, name: result.name ?? `${base.name}: conversation`.slice(0, 120),
        description: result.description ?? `Collects what the rule "${base.name}" asks for.`, definition: result.definition,
        // Started by the policy's block, by key. This button is never sent, so no driver message starts it by itself.
        triggerType: 'BUTTON', triggerConfig: { buttonId: `policy-flow:${base.key}` },
      });

      const merged = revisionPayload(base, { onBlock: { ...(base.onBlock ?? { mode: 'BLOCK' }), flowKey } });
      assertValidPayload(merged);
      let draft;
      if (base.status === 'DRAFT') {
        await repo.setStatus(tx, organizationId, base.id, { onBlock: merged.onBlock });
        draft = { ...base, onBlock: merged.onBlock };
      } else {
        draft = await repo.insertDraft(tx, organizationId, {
          ...merged, version: await repo.nextVersion(tx, organizationId, base.key), isSystem: base.isSystem, sourceInstruction: base.sourceInstruction, createdByUserId: actor.userId,
        });
      }
      await repo.audit(tx, {
        organizationId, actorUserId: actor.userId, action: 'POLICY_FLOW_GENERATED', entityId: draft.id,
        before: { id: base.id, version: base.version }, after: { id: draft.id, version: draft.version, flowKey },
      });
      return {
        result: { policy: draft, flow: { key: flow.key, version: flow.version }, collects: brief.collect.map((c) => c.name), waitsFor: brief.waitFor, attempts: result.attempts },
        events: [changed(draft, 'flow generated')], subject: { type: 'POLICY', id: draft.id },
      };
    },
  });
}

module.exports = { generateFlowAction: createGenerateFlowAction(), createGenerateFlowAction };
