/**
 * Conversation flow runtime: executes a flow definition (see ../seeds.js for the shape) as a deterministic step interpreter. The
 * runtime owns conversation sequencing and static texts; whitelisted ACTION steps (implemented by the WhatsApp interface) own everything
 * dynamic and every state change, so a manager can reshape a conversation but never bypass the job rules or their policies.
 *
 * Runtime state lives on the conversation as:
 *   { type: 'FLOW_ACTIVE', flowKey, flowVersion, stepId, data, options? }
 *
 * Everything environment-specific (sending, persistence, actions, prompt providers, classification) is injected through a deps object,
 * so the same interpreter powers the live bot, the dashboard simulator and the unit tests.
 */
const { logger } = require('../../../platform/logger');
const { PENDING_TYPE, CONDITION_TESTS, renderTemplate, resolveParams, stepById, currentStep, choiceMessage } = require('./match');

const MAX_STEPS_PER_RUN = 50; // safety valve against runaway definitions

async function endFlow(deps, pending, text, data) {
  if (text) await deps.send({ body: renderTemplate(text, data) });
  await deps.clearFlowPending(pending.flowKey);
  return { handled: true, done: true };
}

/**
 * Run steps from `stepId` until a step waits for input (pending saved) or
 * the flow ends (pending cleared). `refs` carries input-specific values.
 */
async function runFrom(deps, flow, pending, stepId, context, refs) {
  let current = stepId;
  const data = { ...pending.data }; // mutable across steps; actions may update it
  for (let guard = 0; guard < MAX_STEPS_PER_RUN; guard += 1) {
    const step = stepById(flow, current);
    if (!step) {
      logger.error(`Flow ${flow.key}: step "${current}" missing, aborting.`);
      await deps.clearFlowPending(flow.key);
      return { handled: true, done: true };
    }

    switch (step.type) {
      case 'SAY': {
        await deps.send({ body: renderTemplate(step.text, data) });
        current = step.next;
        break;
      }

      case 'ACTION': {
        const params = resolveParams(step.params, refs);
        const action = deps.actions?.[step.name];
        if (!action) {
          logger.error(`Flow ${flow.key}: unknown action "${step.name}", aborting.`);
          await deps.clearFlowPending(flow.key);
          return { handled: true, done: true };
        }
        const result = await action(context, params, data, refs);
        if (result?.end) {
          await deps.clearFlowPending(flow.key);
          return { handled: true, done: true };
        }
        if (result?.retry) {
          // Controlled re-ask of the most recent waiting step (e.g. a
          // correction loop) without a static graph cycle.
          if (!pending.lastWaitStepId) {
            logger.error(`Flow ${flow.key}: action "${step.name}" retried with no prior ASK step.`);
            await deps.clearFlowPending(flow.key);
            return { handled: true, done: true };
          }
          current = pending.lastWaitStepId;
        } else if (result?.goto) {
          current = result.goto;
        } else if (step.next) {
          current = step.next;
        } else {
          await deps.clearFlowPending(flow.key);
          return { handled: true, done: true };
        }
        break;
      }

      case 'IF': {
        // A fork on a fact the bot already has; nothing is sent and nothing waits.
        const test = CONDITION_TESTS[step.check];
        if (!test) {
          logger.error(`Flow ${flow.key}: unknown check "${step.check}", aborting.`);
          await deps.clearFlowPending(flow.key);
          return { handled: true, done: true };
        }
        current = test(data) ? step.then : step.else;
        break;
      }

      case 'END':
        return await endFlow(deps, { ...pending, data }, step.text, data);

      case 'ASK_CHOICE':
      case 'ASK_LOCATION':
      case 'ASK_PHOTO':
      case 'ASK_TEXT': {
        // Resolve the prompt (static text, or a dynamic provider).
        let text = step.text ?? null;
        let options = Array.isArray(step.options) ? step.options : null;
        if (step.promptFrom) {
          const provider = deps.promptProviders?.[step.promptFrom];
          if (!provider) {
            logger.error(`Flow ${flow.key}: unknown prompt provider "${step.promptFrom}".`);
            await deps.clearFlowPending(flow.key);
            return { handled: true, done: true };
          }
          const provided = await provider(context, data, step.promptParams ?? {});
          if (provided?.endWithText != null) {
            return await endFlow(deps, { ...pending, data }, provided.endWithText, data);
          }
          if (provided?.text != null) text = provided.text;
          if (Array.isArray(provided?.options)) options = provided.options;
        }

        const waiting = { ...pending, data, stepId: step.id, lastWaitStepId: step.id };

        if (step.type === 'ASK_TEXT') {
          if (step.sendText !== false && text) {
            await deps.send({ body: renderTemplate(text, data) });
          }
          waiting.options = null;
        } else {
          const resolved = (options ?? []).map((o) => ({
            ...o,
            next: o.next ?? step.next,
          }));
          waiting.options = resolved;
          const message =
            step.type === 'ASK_CHOICE'
              ? choiceMessage(step, resolved)
              : resolved.length > 0
                ? { buttons: resolved.map((o) => ({ id: o.id, title: o.label })) }
                : {};
          await deps.send({ body: renderTemplate(text ?? '', data), ...message });
        }

        await deps.savePending(waiting);
        return { handled: true, waiting: true };
      }

      default:
        logger.error(`Flow ${flow.key}: unsupported step type "${step.type}".`);
        await deps.clearFlowPending(flow.key);
        return { handled: true, done: true };
    }
  }
  logger.error(`Flow ${flow.key}: exceeded ${MAX_STEPS_PER_RUN} steps, aborting.`);
  await deps.clearFlowPending(flow.key);
  return { handled: true, done: true };
}

/** Start a flow at its entry step. */
async function startFlow(deps, flow, context, initialData = {}) {
  const entry = flow.definition?.steps?.[0]?.id;
  if (!entry) return { handled: false };
  const pending = {
    type: PENDING_TYPE,
    flowKey: flow.key,
    flowVersion: flow.version,
    stepId: entry,
    data: { ...initialData },
  };
  return await runFrom(deps, flow, pending, entry, context, { ...initialData });
}

function cancelMatch(step, text) {
  if (!step.cancelPattern || !text) return false;
  try {
    return new RegExp(step.cancelPattern, 'i').test(text);
  } catch {
    return false;
  }
}

async function reprompt(deps, flow, pending, step, data) {
  if (step.reprompt) {
    await deps.send({ body: renderTemplate(step.reprompt, data) });
    return { handled: true, waiting: true };
  }
  return { handled: false };
}

/**
 * Feed driver input into a waiting flow.
 * input: { text?, buttonId?, candidate?, location?: {lat,lng}, photo? }
 */
async function advanceFlow(deps, flow, pending, input, context) {
  const step = currentStep(flow, pending);
  if (!step) {
    await deps.clearFlowPending(flow.key);
    return { handled: false };
  }
  const data = { ...pending.data };
  const refs = {
    ...data,
    text: input.text ?? null,
    candidate: input.candidate ?? null,
    buttonId: input.buttonId ?? null,
    lat: input.location?.lat ?? null,
    lng: input.location?.lng ?? null,
  };

  // A button tap first tries the waiting step's stored options.
  if (input.buttonId && Array.isArray(pending.options)) {
    const option = pending.options.find((o) => o.id === input.buttonId);
    if (option) {
      if (step.saveAs) data[step.saveAs] = option.label;
      refs.optionId = option.id;
      refs.optionLabel = option.label;
      refs.optionParam = option.param ?? option.id;
      return await runFrom(deps, flow, { ...pending, data }, option.next, context, {
        ...refs,
        ...data,
      });
    }
  }

  // Location input for location steps.
  if (input.location && step.type === 'ASK_LOCATION') {
    if (step.saveAs) data[step.saveAs] = input.location;
    return await runFrom(deps, flow, { ...pending, data }, step.next, context, {
      ...refs,
      ...data,
    });
  }

  // Photo input for photo steps.
  if (input.photo && step.type === 'ASK_PHOTO') {
    if (step.saveAs) data[step.saveAs] = input.photo;
    return await runFrom(deps, flow, { ...pending, data }, step.next, context, {
      ...refs,
      ...data,
    });
  }

  // Text input.
  if (input.text != null) {
    if (cancelMatch(step, input.text)) {
      return await endFlow(deps, pending, step.cancelText ?? null, data);
    }

    if (step.onText) {
      const onText = step.onText;
      let target = null;
      if (onText.intentMap && input.candidate) {
        target = onText.intentMap[input.candidate.intent] ?? null;
        if (!target && onText.elseNext) target = onText.elseNext;
      } else if (onText.next) {
        target = onText.next;
      }
      if (target) {
        if (onText.saveAs ?? step.saveAs) data[onText.saveAs ?? step.saveAs] = input.text;
        return await runFrom(deps, flow, { ...pending, data }, target, context, {
          ...refs,
          ...data,
        });
      }
    }

    if (step.classify && deps.classify) {
      if (step.saveAs) data[step.saveAs] = input.text;
      const categoryId = await deps.classify(input.text, step.classify.categories, context);
      const category = step.classify.categories.find((c) => c.id === categoryId);
      const target = category?.next ?? step.classify.fallback;
      data[`${step.saveAs ?? 'answer'}Category`] = category?.id ?? null;
      return await runFrom(deps, flow, { ...pending, data }, target, context, {
        ...refs,
        ...data,
      });
    }

    if (step.next && step.type === 'ASK_TEXT' && !step.onText && !step.classify) {
      if (step.saveAs) data[step.saveAs] = input.text;
      return await runFrom(deps, flow, { ...pending, data }, step.next, context, {
        ...refs,
        ...data,
      });
    }

    return await reprompt(deps, flow, pending, step, data);
  }

  return { handled: false };
}

module.exports = { PENDING_TYPE, MAX_STEPS_PER_RUN, startFlow, advanceFlow };
