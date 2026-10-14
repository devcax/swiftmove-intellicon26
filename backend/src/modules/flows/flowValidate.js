/**
 * Conversation flow definition validator.
 *
 * Pure functions — no database, no I/O — so the API, the dashboard (via the
 * API's error messages) and the unit tests all share the same rules. A flow
 * definition is a small DAG of typed steps; managers compose them from a
 * fixed vocabulary, never free-form code. Publishing an invalid definition
 * is impossible: routes/flows.js rejects anything validateFlow() flags.
 */

const STEP_TYPES = new Set([
  'SAY',
  'ASK_CHOICE',
  'ASK_TEXT',
  'ASK_LOCATION',
  'ASK_PHOTO',
  'ACTION',
  'IF',
  'END',
]);

const { CONDITION_NAMES } = require('./vocabulary');
const {
  STEP_ID_PATTERN, MAX_STEPS, MAX_OPTIONS, TEMPLATE_PATTERN, err, isPlainObject, checkText, checkCancel, checkOptions, checkOnText, checkClassify,
} = require('./flowChecks');


/** Every step id referenced by next/branches inside a step. */
function referencedTargets(step) {
  const targets = [];
  if (typeof step.next === 'string') targets.push(step.next);
  if (step.type === 'IF') {
    if (typeof step.then === 'string') targets.push(step.then);
    if (typeof step.else === 'string') targets.push(step.else);
  }
  if (Array.isArray(step.options)) {
    for (const option of step.options) {
      if (typeof option?.next === 'string') targets.push(option.next);
    }
  }
  if (step.onText) {
    if (typeof step.onText.next === 'string') targets.push(step.onText.next);
    if (typeof step.onText.elseNext === 'string') targets.push(step.onText.elseNext);
    if (isPlainObject(step.onText.intentMap)) {
      for (const target of Object.values(step.onText.intentMap)) {
        if (typeof target === 'string') targets.push(target);
      }
    }
  }
  if (Array.isArray(step.classify?.categories)) {
    for (const category of step.classify.categories) {
      if (typeof category?.next === 'string') targets.push(category.next);
    }
  }
  if (typeof step.classify?.fallback === 'string') targets.push(step.classify.fallback);
  return targets;
}

/**
 * Validate a flow definition.
 * @param {object} definition  The definition jsonb, e.g. { steps: [...] }.
 * @param {{ actions?: string[], promptProviders?: string[] }} known
 *        Whitelists the server accepts for ACTION steps / promptFrom.
 * @returns {{ ok: boolean, errors: Array<{ step: string|null, message: string }> }}
 */
function validateFlow(definition, known = {}) {
  const actions = new Set(known.actions ?? []);
  const promptProviders = new Set(known.promptProviders ?? []);
  const errors = [];

  if (!isPlainObject(definition) || !Array.isArray(definition.steps)) {
    return { ok: false, errors: [{ step: null, message: 'definition.steps must be an array.' }] };
  }
  const steps = definition.steps;
  if (steps.length === 0) {
    return { ok: false, errors: [{ step: null, message: 'A flow needs at least one step.' }] };
  }
  if (steps.length > MAX_STEPS) {
    return { ok: false, errors: [{ step: null, message: `A flow can have at most ${MAX_STEPS} steps.` }] };
  }

  const byId = new Map();
  for (const step of steps) {
    if (!isPlainObject(step) || typeof step.id !== 'string' || !STEP_ID_PATTERN.test(step.id)) {
      err(errors, null, `Every step needs an id matching ${STEP_ID_PATTERN}.`);
      continue;
    }
    if (byId.has(step.id)) {
      err(errors, step.id, `Duplicate step id "${step.id}".`);
      continue;
    }
    byId.set(step.id, step);

    if (!STEP_TYPES.has(step.type)) {
      err(errors, step.id, `Unknown step type "${step.type}". Allowed: ${[...STEP_TYPES].join(', ')}.`);
      continue;
    }

    switch (step.type) {
      case 'SAY':
        checkText(errors, step, 'text', step.text);
        if (typeof step.next !== 'string' || step.next.length === 0) {
          err(errors, step.id, 'SAY steps need a next step id (use an END step to finish).');
        }
        break;
      case 'ASK_CHOICE':
        if (step.text != null) checkText(errors, step, 'text', step.text);
        if (step.text == null && step.promptFrom == null) {
          err(errors, step.id, 'ASK_CHOICE needs text or promptFrom.');
        }
        checkOptions(errors, step, step.options, { required: true });
        checkOnText(errors, step);
        checkCancel(errors, step);
        break;
      case 'ASK_TEXT':
        if (step.text != null) checkText(errors, step, 'text', step.text);
        if (step.text == null && step.promptFrom == null && step.sendText !== false) {
          err(errors, step.id, 'ASK_TEXT needs text or promptFrom (or sendText:false when the prompt was already sent).');
        }
        if (step.saveAs != null && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(step.saveAs)) {
          err(errors, step.id, 'saveAs must be a plain variable name.');
        }
        checkOnText(errors, step);
        checkClassify(errors, step);
        checkCancel(errors, step);
        if (step.next == null && !step.onText && !step.classify) {
          err(errors, step.id, 'ASK_TEXT needs next, onText or classify to route the answer.');
        }
        break;
      case 'ASK_LOCATION':
      case 'ASK_PHOTO':
        if (step.text != null) checkText(errors, step, 'text', step.text);
        if (step.text == null && step.promptFrom == null) {
          err(errors, step.id, `${step.type} needs text or promptFrom.`);
        }
        checkOptions(errors, step, step.options, { required: false });
        if (step.reprompt != null) checkText(errors, step, 'reprompt', step.reprompt);
        if (typeof step.next !== 'string' || step.next.length === 0) {
          err(errors, step.id, `${step.type} needs a next step id for a successful answer.`);
        }
        break;
      case 'ACTION':
        if (typeof step.name !== 'string' || step.name.length === 0) {
          err(errors, step.id, 'ACTION steps need a name.');
        } else if (actions.size > 0 && !actions.has(step.name)) {
          err(errors, step.id, `Unknown action "${step.name}". Allowed: ${[...actions].join(', ')}.`);
        }
        if (step.params != null && !isPlainObject(step.params)) {
          err(errors, step.id, 'ACTION params must be an object.');
        }
        break;
      case 'IF':
        if (!CONDITION_NAMES.includes(step.check)) {
          err(errors, step.id, `IF needs a check, one of: ${CONDITION_NAMES.join(', ')}.`);
        }
        if (typeof step.then !== 'string' || step.then.length === 0) err(errors, step.id, 'IF needs a "then" step id (where to go when the check is true).');
        if (typeof step.else !== 'string' || step.else.length === 0) err(errors, step.id, 'IF needs an "else" step id (where to go when it is not).');
        break;
      case 'END':
        if (step.text != null) checkText(errors, step, 'text', step.text);
        break;
      default:
        break;
    }

    if (step.promptFrom != null && promptProviders.size > 0 && !promptProviders.has(step.promptFrom)) {
      err(errors, step.id, `Unknown prompt provider "${step.promptFrom}". Allowed: ${[...promptProviders].join(', ')}.`);
    }
  }

  // Branch targets must exist.
  for (const step of steps) {
    if (!step?.id) continue;
    for (const target of referencedTargets(step)) {
      if (!byId.has(target)) {
        err(errors, step.id, `Points at unknown step "${target}".`);
      }
    }
  }

  // Reachability from the entry step + cycle check (flows must be DAGs).
  const entry = steps[0]?.id;
  if (entry && byId.has(entry)) {
    const reachable = new Set();
    const queue = [entry];
    while (queue.length > 0) {
      const id = queue.shift();
      if (reachable.has(id) || !byId.has(id)) continue;
      reachable.add(id);
      queue.push(...referencedTargets(byId.get(id)));
    }
    for (const step of steps) {
      if (step?.id && !reachable.has(step.id)) {
        err(errors, step.id, 'Unreachable step — no branch leads here.');
      }
    }

    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map([...reachable].map((id) => [id, WHITE]));
    const visit = (id) => {
      color.set(id, GRAY);
      for (const target of referencedTargets(byId.get(id))) {
        if (!color.has(target)) continue;
        if (color.get(target) === GRAY) {
          err(errors, target, `Cycle detected involving step "${target}" — flows cannot loop.`);
          return;
        }
        if (color.get(target) === WHITE) visit(target);
      }
      color.set(id, BLACK);
    };
    for (const id of reachable) {
      if (color.get(id) === WHITE) visit(id);
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// INTENT trigger helpers — topic routing for general questions
// ---------------------------------------------------------------------------

const TOPIC_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * GENERAL_QUESTION flows may carry a topic slug (e.g. "water"); the topic
 * router then picks among several same-intent flows. A flow without a topic
 * is the default that answers when no topic matches. Topics are pointless on
 * any other intent because only one flow can own it anyway.
 */
function validateTriggerTopic(intent, topic) {
  if (topic == null || String(topic).trim() === '') return { value: null };
  if (intent !== 'GENERAL_QUESTION') {
    return { error: 'A topic is only meaningful on the GENERAL_QUESTION intent — every other intent can only have one flow anyway.' };
  }
  const value = String(topic).trim().toLowerCase();
  if (value === 'other') {
    return { error: '"other" is reserved — it is what the router answers when no topic fits.' };
  }
  if (!TOPIC_PATTERN.test(value)) {
    return { error: 'topic must be 1-40 characters: lowercase letters, digits and dashes (e.g. water, working-hours).' };
  }
  return { value };
}

/** Two INTENT trigger configs clash when they would compete for the same message. */
function intentTriggersClash(a, b) {
  if ((a?.intent ?? null) !== (b?.intent ?? null)) return false;
  if (a?.intent === 'GENERAL_QUESTION') {
    // Topics partition the intent: different topics never compete, and a
    // topic-less default only clashes with another default.
    return (a?.topic ?? null) === (b?.topic ?? null);
  }
  return true;
}

module.exports = {
  STEP_TYPES,
  MAX_OPTIONS,
  MAX_STEPS,
  TEMPLATE_PATTERN,
  referencedTargets,
  validateFlow,
  validateTriggerTopic,
  intentTriggersClash,
};
