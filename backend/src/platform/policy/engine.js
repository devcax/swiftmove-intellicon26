/**
 * Policy engine — evaluates PUBLISHED GATEWAY policies against the fresh
 * action context before a business action changes state.
 *
 * The engine only interprets the constrained DSL (all/any/not over capability
 * leaves). It never runs generated code: leaves dispatch to the compiled
 * capability registry. Evaluation is read-only and bounded by the DSL limits
 * (depth/leaves/children), so evaluation cost is capped by construction.
 *
 * Results are structured: allowed, the failed requirements (ordered by policy
 * position, then leaf order — the seeds reproduce the old hardcoded check
 * precedence), the missing evidence, and the recommended next step.
 *
 * Fail-safe: an evaluator that throws produces a blocking, visible
 * POLICY_EVAL_ERROR instead of being silently skipped — an unreadable rule
 * must never look like a satisfied one.
 */
const { getCheck } = require('../registry');
const sm = require('../jobStateMachine');

function matchValue(expected, actual) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if (Object.prototype.hasOwnProperty.call(expected, 'in')) {
      return Array.isArray(expected.in) && expected.in.includes(actual);
    }
    if (Object.prototype.hasOwnProperty.call(expected, 'not')) {
      return actual !== expected.not;
    }
    if (Object.prototype.hasOwnProperty.call(expected, 'rankGt')) {
      const actualRank = sm.STAGE_RANK[actual];
      const boundRank = sm.STAGE_RANK[expected.rankGt];
      return actualRank != null && boundRank != null && actualRank > boundRank;
    }
    return false;
  }
  return expected === actual;
}

/** Does a policy's match block apply to this action context? */
function matchApplies(match, ctx) {
  for (const [field, expected] of Object.entries(match ?? {})) {
    const actual = field === 'source' ? ctx.source : field === 'actor' ? ctx.actor : ctx.params[field];
    if (!matchValue(expected, actual)) return false;
  }
  return true;
}

function leafFailure(requirement, params, outcome) {
  return {
    requirement,
    params,
    code: outcome.code ?? 'REQUIREMENT_FAILED',
    message: outcome.message ?? 'A requirement is not met.',
    reason: outcome.reason ?? outcome.message ?? null,
    evidence: outcome.evidence ?? null,
    details: outcome.details ?? null,
  };
}

async function evalLeaf(node, ctx) {
  const capability = getCheck(node.requirement);
  if (!capability || capability.available === false) {
    // The DSL validator rejects these before publication; if one still shows
    // up (registry changed underneath a published row), fail closed and loud.
    return {
      pass: false,
      failures: [
        leafFailure(node.requirement, node.params ?? {}, {
          code: 'UNSUPPORTED_CAPABILITY',
          message: `The requirement "${node.requirement}" is not supported, so this policy cannot be satisfied.`,
          reason: 'the capability has no compiled evaluator',
        }),
      ],
    };
  }
  try {
    const outcome = await capability.evaluate(ctx, node.params ?? {});
    if (outcome?.pass) return { pass: true, failures: [] };
    return { pass: false, failures: [leafFailure(node.requirement, node.params ?? {}, outcome ?? {})] };
  } catch (err) {
    return {
      pass: false,
      failures: [
        leafFailure(node.requirement, node.params ?? {}, {
          code: 'POLICY_EVAL_ERROR',
          message: 'This check could not be evaluated right now, so the action was not allowed.',
          reason: `evaluator error: ${err.message}`,
        }),
      ],
    };
  }
}

async function evalNode(node, ctx) {
  if (node && Array.isArray(node.all)) {
    const failures = [];
    for (const child of node.all) {
      const childResult = await evalNode(child, ctx);
      failures.push(...childResult.failures);
    }
    return { pass: failures.length === 0, failures };
  }
  if (node && Array.isArray(node.any)) {
    let first = null;
    for (const child of node.any) {
      const childResult = await evalNode(child, ctx);
      if (childResult.pass) return { pass: true, failures: [] };
      first = first ?? childResult;
    }
    // None of the alternatives passed: report the first one as the way out.
    return { pass: false, failures: first?.failures ?? [] };
  }
  if (node && Object.prototype.hasOwnProperty.call(node, 'not')) {
    const childResult = await evalNode(node.not, ctx);
    if (!childResult.pass) return { pass: true, failures: [] };
    const requirement = node.not?.requirement ?? 'condition';
    return {
      pass: false,
      failures: [
        leafFailure(`not(${requirement})`, {}, {
          code: 'FORBIDDEN_CONDITION',
          message: 'A condition that must not hold is currently true.',
          reason: `"${requirement}" holds but the policy requires it not to`,
        }),
      ],
    };
  }
  return evalLeaf(node ?? {}, ctx);
}

/**
 * Evaluate the policies for one action against the context.
 * @param {Array} policies GATEWAY policies for the action, ordered by position.
 * @returns {Promise<{allowed: boolean, failures: Array, warnings: Array, evaluated: Array}>}
 */
async function evaluatePolicies(policies, ctx) {
  const failures = [];
  const warnings = [];
  const evaluated = [];

  for (const policy of policies) {
    if (policy.enabled === false) continue;
    if (!matchApplies(policy.match, ctx)) continue;

    const result = await evalNode(policy.rule, ctx);
    const blockMode = policy.onBlock?.mode ?? 'BLOCK';
    evaluated.push({ policyId: policy.id, policyKey: policy.key, pass: result.pass });

    for (const failure of result.failures) {
      const entry = {
        policyId: policy.id,
        policyKey: policy.key,
        policyName: policy.name,
        blockMode,
        onBlock: policy.onBlock ?? { mode: 'BLOCK' },
        ...failure,
      };
      if (blockMode === 'WARN') warnings.push(entry);
      else failures.push(entry);
    }
  }

  return { allowed: failures.length === 0, failures, warnings, evaluated };
}

module.exports = { evaluatePolicies, matchApplies, evalNode };
