/**
 * Policy DSL validator — the constrained JSON format managers (and the AI
 * author) may use. There is no eval(), no exec(), no arbitrary JavaScript,
 * no SQL: a rule is a small tree of `all` / `any` / `not` combinators over
 * leaves that name a capability from the compiled registry plus literal
 * params. The validator enforces the vocabulary, nesting/size/cost limits,
 * and per-capability param schemas — independently of whatever produced the
 * draft.
 */
const { getAction, getCheck, listChecks } = require('../registry');

/** Match fields every action supports, in addition to its own. */
const GENERIC_MATCH_FIELDS = ['source', 'actor'];
/** Match operators understood by the engine: scalar equality, {in}, {not}, {rankGt}. */
const MATCH_OPERATORS = ['in', 'not', 'rankGt'];

const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const MAX_DEPTH = 4;
const MAX_LEAVES = 12;
const MAX_CHILDREN = 12;
const MAX_PARAMS_CHARS = 1024;
const MAX_MATCH_KEYS = 6;
const MAX_SETTING_CHARS = 2048;
const BLOCK_MODES = ['BLOCK', 'WARN', 'ESCALATE'];
const RANKABLE_STATUSES = [
  'PUBLISHED', 'DRIVER_REQUESTED', 'MANAGER_APPROVED', 'ASSIGNMENT_SENT', 'ASSIGNED',
  'IN_PROGRESS', 'ARRIVED_AT_PICKUP', 'LOADING_STARTED', 'LOADED', 'DEPARTED',
  'ARRIVED_AT_DELIVERY', 'UNLOADING_STARTED', 'UNLOADED', 'DELIVERED',
  'DELIVERED_WITH_EXCEPTION', 'DRIVER_SUBMITTED_COMPLETION', 'MANAGER_REVIEW',
  'REQUIRES_CORRECTION', 'COMPLETED', 'CANCELLED',
];

const { err, isPlainObject, validateParamValue } = require('./dslParams');

function validateLeaf(node, path, errors, state) {
  if (!isPlainObject(node) || typeof node.requirement !== 'string') {
    errors.push(err(path, 'a requirement leaf must be {"requirement": name, "params"?: {...}}'));
    return;
  }
  const capability = getCheck(node.requirement);
  if (!capability) {
    errors.push(
      err(
        path,
        `"${node.requirement}" is not a supported capability. Supported: ${listChecks().map((c) => c.name).join(', ')}`
      )
    );
    return;
  }
  if (capability.available === false) {
    errors.push(
      err(
        path,
        `"${node.requirement}" is not supported yet: ${capability.unavailableReason ?? 'no evaluator exists'}. The policy cannot be activated with it.`
      )
    );
    return;
  }
  if (capability.actions !== '*' && state.action && !capability.actions.includes(state.action)) {
    errors.push(
      err(
        path,
        `"${node.requirement}" cannot be used on ${state.action}. It applies to: ${capability.actions.join(', ')}.`
      )
    );
  }
  state.leaves += 1;
  const extraKeys = Object.keys(node).filter((k) => !['requirement', 'params'].includes(k));
  if (extraKeys.length > 0) {
    errors.push(err(path, `a requirement leaf may only have "requirement" and "params" (found: ${extraKeys.join(', ')})`));
  }
  const params = node.params ?? {};
  if (!isPlainObject(params)) {
    errors.push(err(path, `"params" for ${node.requirement} must be an object`));
    return;
  }
  if (JSON.stringify(params).length > MAX_PARAMS_CHARS) {
    errors.push(err(path, `"params" for ${node.requirement} is too large`));
    return;
  }
  const declared = new Map((capability.paramSpec ?? []).map((p) => [p.name, p]));
  for (const key of Object.keys(params)) {
    if (!declared.has(key)) {
      errors.push(err(path, `${node.requirement} has no parameter "${key}" (has: ${[...declared.keys()].join(', ') || 'none'})`));
    }
  }
  for (const schema of capability.paramSpec ?? []) {
    validateParamValue(schema, params[schema.name], `${path}.${schema.name}`, errors);
  }
}

function validateNode(node, depth, path, errors, state) {
  if (depth > MAX_DEPTH) {
    errors.push(err(path, `rules can nest at most ${MAX_DEPTH} levels`));
    return;
  }
  if (!isPlainObject(node)) {
    errors.push(err(path, 'a rule node must be an object'));
    return;
  }
  const keys = Object.keys(node);
  if (keys.includes('all') || keys.includes('any')) {
    const op = keys.includes('all') ? 'all' : 'any';
    if (keys.length !== 1) errors.push(err(path, `"${op}" cannot be mixed with other fields in one node`));
    const children = node[op];
    if (!Array.isArray(children) || children.length === 0) {
      errors.push(err(path, `"${op}" needs a non-empty list of conditions`));
      return;
    }
    if (children.length > MAX_CHILDREN) {
      errors.push(err(path, `"${op}" accepts at most ${MAX_CHILDREN} conditions`));
      return;
    }
    children.forEach((child, i) => validateNode(child, depth + 1, `${path}.${op}[${i}]`, errors, state));
    return;
  }
  if (keys.includes('not')) {
    if (keys.length !== 1) errors.push(err(path, '"not" cannot be mixed with other fields in one node'));
    validateNode(node.not, depth + 1, `${path}.not`, errors, state);
    return;
  }
  validateLeaf(node, path, errors, state);
}

function validateMatchValue(field, value, path, errors) {
  const scalarOk = (v) => ['string', 'number', 'boolean'].includes(typeof v) && String(v).length <= 100;
  if (scalarOk(value)) return;
  if (isPlainObject(value)) {
    const ops = Object.keys(value);
    if (ops.length !== 1 || !MATCH_OPERATORS.includes(ops[0])) {
      errors.push(err(path, `match "${field}" supports exactly one operator: ${MATCH_OPERATORS.join(', ')}`));
      return;
    }
    const [op] = ops;
    if (op === 'in') {
      if (!Array.isArray(value.in) || value.in.length === 0 || value.in.length > 10 || !value.in.every(scalarOk)) {
        errors.push(err(path, `match "${field}".in must be a list of 1-10 simple values`));
      }
      return;
    }
    if (op === 'not') {
      if (!scalarOk(value.not)) errors.push(err(path, `match "${field}".not must be a simple value`));
      return;
    }
    if (op === 'rankGt') {
      if (!RANKABLE_STATUSES.includes(value.rankGt)) {
        errors.push(err(path, `match "${field}".rankGt must be a known status`));
      }
      return;
    }
  }
  errors.push(err(path, `match "${field}" must be a simple value or one of {in}, {not}, {rankGt}`));
}

function validateOnBlock(onBlock, errors) {
  if (onBlock == null) return;
  if (!isPlainObject(onBlock)) {
    errors.push(err('onBlock', 'onBlock must be an object'));
    return;
  }
  const mode = onBlock.mode ?? 'BLOCK';
  if (!BLOCK_MODES.includes(mode)) {
    errors.push(err('onBlock.mode', `must be one of ${BLOCK_MODES.join(', ')}`));
  }
  const extra = Object.keys(onBlock).filter((k) => !['mode', 'message', 'flowKey'].includes(k));
  if (extra.length > 0) errors.push(err('onBlock', `unknown fields: ${extra.join(', ')}`));
  if (onBlock.message != null && (typeof onBlock.message !== 'string' || onBlock.message.length > 500)) {
    errors.push(err('onBlock.message', 'must be a text of at most 500 characters'));
  }
  if (onBlock.flowKey != null && !KEY_PATTERN.test(String(onBlock.flowKey))) {
    errors.push(err('onBlock.flowKey', 'must be a flow key like "delay.reason"'));
  }
}

/**
 * Validate one policy definition (without row metadata).
 * @returns {{ ok: boolean, errors: {field: string, message: string}[] }}
 */
function validatePolicy(policy) {
  const errors = [];
  if (!isPlainObject(policy)) return { ok: false, errors: [err('policy', 'a policy must be an object')] };

  // Action
  const action = getAction(policy.action);
  if (!action) {
    errors.push(err('action', `"${policy.action}" is not a known action`));
  }

  // Match block
  const match = policy.match ?? {};
  if (!isPlainObject(match)) {
    errors.push(err('match', 'match must be an object'));
  } else {
    const keys = Object.keys(match);
    if (keys.length > MAX_MATCH_KEYS) errors.push(err('match', `at most ${MAX_MATCH_KEYS} match fields`));
    const allowed = new Set([...(action?.matchFields ?? []), ...GENERIC_MATCH_FIELDS]);
    for (const key of keys) {
      if (!allowed.has(key)) {
        errors.push(err('match', `"${key}" cannot constrain ${policy.action} (allowed: ${[...allowed].join(', ') || 'none'})`));
        continue;
      }
      validateMatchValue(key, match[key], `match.${key}`, errors);
    }
  }

  // Rule
  const enforcement = policy.enforcement ?? 'GATEWAY';
  if (!['GATEWAY', 'SETTING'].includes(enforcement)) {
    errors.push(err('enforcement', 'must be GATEWAY or SETTING'));
  }
  if (enforcement === 'SETTING') {
    const setting = policy.rule?.setting;
    if (!isPlainObject(setting)) {
      errors.push(err('rule.setting', 'a SETTING policy carries its parameters in rule.setting (an object)'));
    } else if (JSON.stringify(setting).length > MAX_SETTING_CHARS) {
      errors.push(err('rule.setting', 'the setting payload is too large'));
    }
  } else {
    const state = { leaves: 0, action: action ? policy.action : null };
    validateNode(policy.rule, 1, 'rule', errors, state);
    if (state.leaves === 0) errors.push(err('rule', 'a policy needs at least one requirement'));
    if (state.leaves > MAX_LEAVES) errors.push(err('rule', `a policy supports at most ${MAX_LEAVES} requirements`));
  }

  validateOnBlock(policy.onBlock, errors);

  return { ok: errors.length === 0, errors };
}

/** Validate the metadata fields used when creating/renaming a policy. */
function validatePolicyMeta({ key, name, description }) {
  const errors = [];
  if (key != null && !KEY_PATTERN.test(String(key))) {
    errors.push(err('key', 'keys are lowercase slugs like "job.late-pickup" (a-z 0-9 . _ -)'));
  }
  if (name != null && (typeof name !== 'string' || name.trim().length < 3 || name.length > 160)) {
    errors.push(err('name', 'a name of 3-160 characters is required'));
  }
  if (description != null && typeof description === 'string' && description.length > 1000) {
    errors.push(err('description', 'descriptions are limited to 1000 characters'));
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { validatePolicy, validatePolicyMeta, KEY_PATTERN, BLOCK_MODES, MAX_DEPTH, MAX_LEAVES };
