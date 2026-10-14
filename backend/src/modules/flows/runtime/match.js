/**
 * Which flow a driver's message, a button tap or an event starts, and how a step's text and parameters are filled in. Pure: no database,
 * no sending. (The flow runtime is the part of the conversation engine that is the same wherever a flow runs: the live bot, the
 * dashboard simulator and the tests.)
 */
const PENDING_TYPE = 'FLOW_ACTIVE';

// ---------------------------------------------------------------------------
// Trigger matching
// ---------------------------------------------------------------------------

/** The facts an IF step can test, over the data a conversation starts with (names match vocabulary.CONDITION_LABELS). */
const CONDITION_TESTS = {
  driver_gave_job_number: (data) => Boolean(data?.jobReference),
  driver_gave_reason: (data) => Boolean(data?.reason),
};

function matchIntentAll(flows, intent) {
  if (!Array.isArray(flows)) return [];
  return flows.filter(
    (f) =>
      f.triggerType === 'INTENT' &&
      f.triggerConfig.intent === intent
  );
}

function matchIntent(flows, intent) {
  return matchIntentAll(flows, intent)[0] ?? null;
}

function matchButton(flows, buttonId) {
  if (!Array.isArray(flows) || !buttonId) return null;
  return (
    flows.find((f) => {
      if (f.triggerType !== 'BUTTON') return false;
      const cfg = f.triggerConfig;
      if (cfg.buttonId && cfg.buttonId === buttonId) return true;
      if (cfg.buttonPrefix && buttonId.startsWith(cfg.buttonPrefix)) return true;
      if (Array.isArray(cfg.buttons) && cfg.buttons.includes(buttonId)) return true;
      return false;
    }) ?? null
  );
}

function matchEvent(flows, event) {
  if (!Array.isArray(flows)) return null;
  return (
    flows.find((f) => f.triggerType === 'EVENT' && f.triggerConfig.event === event) ?? null
  );
}

function buttonParam(flow, buttonId) {
  const prefix = flow?.triggerConfig?.buttonPrefix;
  if (prefix && buttonId.startsWith(prefix)) {
    const rest = buttonId.slice(prefix.length);
    return rest.startsWith(':') ? rest.slice(1) : rest;
  }
  return buttonId;
}

// ---------------------------------------------------------------------------
// Templates & params
// ---------------------------------------------------------------------------

function renderTemplate(text, data) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)(\|([a-z]+))?\}/g, (match, key, _f, filter) => {
    const value = data?.[key];
    if (value == null) return match; // leave unknown placeholders visible
    let out = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (filter === 'lower') out = out.toLowerCase();
    if (filter === 'upper') out = out.toUpperCase();
    return out;
  });
}

/**
 * Resolve ACTION params. Strings starting with "$" pull a raw reference
 * (no stringification) so objects like candidates survive; other strings
 * are template-rendered.
 */
function resolveParams(params, refs) {
  const out = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === 'string' && value.startsWith('$')) {
      out[key] = refs[value.slice(1)];
    } else if (typeof value === 'string') {
      out[key] = renderTemplate(value, refs);
    } else {
      out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Step interpreter
// ---------------------------------------------------------------------------

function stepById(flow, stepId) {
  return flow.definition?.steps?.find((s) => s.id === stepId) ?? null;
}

function currentStep(flow, pending) {
  return stepById(flow, pending?.stepId);
}

/** Steps that need the interpreted candidate before they can consume text. */
function stepNeedsCandidate(step) {
  return Boolean(step?.onText?.intentMap || step?.classify);
}

function choiceMessage(step, options) {
  if (options.length <= 3) {
    return { buttons: options.map((o) => ({ id: o.id, title: o.label })) };
  }
  return {
    listRows: options.map((o) => ({
      id: o.id,
      title: o.label,
      ...(o.description ? { description: o.description } : {}),
    })),
  };
}

module.exports = {
  PENDING_TYPE,
  matchIntent,
  matchIntentAll,
  matchButton,
  matchEvent,
  CONDITION_TESTS,
  buttonParam,
  renderTemplate,
  resolveParams,
  stepById,
  currentStep,
  stepNeedsCandidate,
  choiceMessage,
};
