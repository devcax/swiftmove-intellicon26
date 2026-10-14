const { defineQuery } = require('../../../platform/registry');
const registry = require('../../../platform/registry');
const { NotFoundError, ValidationError } = require('../../../platform/errors');
const runner = require('../../../platform/runner');
const { evaluatePolicies } = require('../../../platform/policy/engine');
const { getGatewayPolicies } = require('../../../platform/policy/store');
const { recommendedNextStep } = require('../../../platform/policy/violation');
const { validatePolicy } = require('../../../platform/policy/dsl');
const sm = require('../../../platform/jobStateMachine');
const { testSchema } = require('../schemas');
const { validationFailure } = require('../validate');
const repo = require('../repo');

const NOTE =
  'Simulated with the real policy engine against the sample you provided. Checks that read history ' +
  '(sent documents, confirmed events) are approximated from the sample’s current stage and fields.';

/** A module action keeps its exact name; a legacy one has always been accepted in any case. */
const resolveActionName = (raw) => (registry.getAction(String(raw)) ? String(raw) : String(raw).toUpperCase());

/** What the conversation with the driver would do next, from the first failure. */
function conversationFor(result) {
  if (result.allowed) return { kind: 'none', message: null };
  const nextStep = recommendedNextStep(result.failures[0]);
  return {
    kind: nextStep?.flowKey ? 'flow' : 'standard-helper',
    flowKey: nextStep?.flowKey ?? null,
    message: nextStep?.message ?? null,
    evidence: nextStep?.evidence ?? null,
    waitsForManager: result.failures.some((f) => f.evidence?.kind === 'MANAGER_REVIEW'),
  };
}

/** The policies to run and the action they gate, from a stored policy, a draft, or an action's published policies. */
async function chooseSubject(input, actor, db) {
  if (input.policyId) {
    const row = await repo.findPolicy(db, actor.organizationId, input.policyId).catch(() => null);
    if (!row) throw new NotFoundError('Policy not found.');
    return { policies: [row], action: row.action };
  }
  if (input.draft) {
    const check = validatePolicy(input.draft);
    if (!check.ok) throw validationFailure(check.errors);
    return {
      policies: [{ id: 'draft.simulation', key: 'draft.simulation', name: input.draft.name ?? 'Simulation draft', ...input.draft }],
      action: resolveActionName(input.draft.action),
    };
  }
  if (input.action) {
    const action = resolveActionName(input.action);
    if (!registry.getAction(action)) throw new ValidationError(`Unknown action "${action}".`);
    return { policies: await getGatewayPolicies(actor.organizationId, action), action };
  }
  throw new ValidationError('Provide an action, a policyId, or a draft to test.');
}

module.exports = defineQuery({
  name: 'policy.test',
  description: 'Try a policy against an example situation with the real policy engine, without changing anything.',
  roles: ['ADMIN', 'MANAGER'],
  input: testSchema,
  handler: async ({ input, actor, db }) => {
    const { policies, action } = await chooseSubject(input, actor, db);
    const registered = registry.getAction(action);

    // A real module action with a real input is checked by the runner as a dry run: its own lock and load steps, nothing kept.
    if (input.input && registered && !registered.target) {
      const dry = await runner.dryRun(action, input.input, actor);
      return { allowed: dry.allowed, failures: dry.failures, warnings: dry.warnings, evaluated: dry.evaluated, nextStep: dry.nextStep, conversation: conversationFor(dry), note: 'Checked by running the action as a dry run: nothing was changed.' };
    }

    const sample = input.sample ?? {};
    const actorType = String(input.actor ?? 'DRIVER').toUpperCase();
    const source = String(input.source ?? 'CHAT').toUpperCase();
    const job = sample.job ?? null;
    const context = {
      organizationId: actor.organizationId, action, actor: actorType, source, now: new Date(), job, driver: sample.driver ?? null,
      assignment: sample.assignment ?? null, releasedFromJob: Boolean(sample.releasedFromJob),
      openIncidents: Array.isArray(sample.openIncidents) ? sample.openIncidents : [],
      currentRank: sample.currentRank ?? (job ? sm.STAGE_RANK[job.current_status] ?? 0 : 0),
      params: { source, ...(sample.params ?? {}) },
      evidence: { driver: sample.evidence?.driver ?? [], job: sample.evidence?.job ?? [], pending: sample.evidence?.pending ?? [] },
    };
    const result = await evaluatePolicies(policies, context);
    return {
      allowed: result.allowed, failures: result.failures, warnings: result.warnings, evaluated: result.evaluated,
      nextStep: recommendedNextStep(result.failures[0]), conversation: conversationFor(result), note: NOTE,
    };
  },
});
