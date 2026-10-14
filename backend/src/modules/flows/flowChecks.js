/** The checks of a single flow step's text, options, routing and cancel pattern. Pure. Used by flowValidate.js. */
const STEP_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
const MAX_STEPS = 100;
const MAX_TEXT_LENGTH = 2000;
const MAX_OPTIONS = 10;
const MAX_OPTION_LABEL = 24;
const TEMPLATE_PATTERN = /\{[a-zA-Z][a-zA-Z0-9_]*(\|[a-z]+)?\}/g;

function err(errors, step, message) {
  errors.push({ step: step ?? null, message });
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function checkText(errors, step, field, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    err(errors, step.id, `${field} must be a non-empty string.`);
    return;
  }
  if (value.length > MAX_TEXT_LENGTH) {
    err(errors, step.id, `${field} is too long (max ${MAX_TEXT_LENGTH} characters).`);
  }
  let depth = 0;
  for (const ch of value) {
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth < 0 || depth > 1) {
      err(errors, step.id, `${field} has unbalanced template braces.`);
      return;
    }
  }
  if (depth !== 0) err(errors, step.id, `${field} has unbalanced template braces.`);
}

function checkCancel(errors, step) {
  if (step.cancelPattern == null) return;
  try {
    // eslint-disable-next-line no-new
    new RegExp(step.cancelPattern, 'i');
  } catch {
    err(errors, step.id, 'cancelPattern is not a valid regular expression.');
  }
  if (step.cancelText != null) checkText(errors, step, 'cancelText', step.cancelText);
}

function checkOptions(errors, step, options, { required }) {
  if (options == null) {
    if (required && !step.promptFrom) {
      err(errors, step.id, 'options are required unless promptFrom supplies them dynamically.');
    }
    return;
  }
  if (!Array.isArray(options) || options.length === 0) {
    err(errors, step.id, 'options must be a non-empty array.');
    return;
  }
  if (options.length > MAX_OPTIONS) {
    err(errors, step.id, `a choice step can have at most ${MAX_OPTIONS} options (WhatsApp list limit).`);
  }
  const seen = new Set();
  options.forEach((option, index) => {
    const where = `${step.id} option ${index + 1}`;
    if (!isPlainObject(option)) {
      err(errors, step.id, `${where} must be an object.`);
      return;
    }
    if (typeof option.id !== 'string' || option.id.length === 0 || option.id.length > 128) {
      err(errors, step.id, `${where} needs an id (1-128 chars).`);
    } else if (seen.has(option.id)) {
      err(errors, step.id, `${where} duplicates option id "${option.id}".`);
    }
    seen.add(option.id);
    if (typeof option.label !== 'string' || option.label.trim().length === 0) {
      err(errors, step.id, `${where} needs a label.`);
    } else if (option.label.length > MAX_OPTION_LABEL) {
      err(errors, step.id, `${where} label is too long (max ${MAX_OPTION_LABEL} characters, WhatsApp limit).`);
    }
    if (typeof option.next !== 'string' || option.next.length === 0) {
      err(errors, step.id, `${where} needs a next step id.`);
    }
  });
}

function checkOnText(errors, step) {
  if (step.onText == null) return;
  if (!isPlainObject(step.onText)) {
    err(errors, step.id, 'onText must be an object.');
    return;
  }
  const { intentMap } = step.onText;
  if (intentMap != null) {
    if (!isPlainObject(intentMap) || Object.keys(intentMap).length === 0) {
      err(errors, step.id, 'onText.intentMap must map intent names to step ids.');
    } else {
      for (const [intent, target] of Object.entries(intentMap)) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(intent)) {
          err(errors, step.id, `onText.intentMap key "${intent}" is not an intent name (UPPER_SNAKE).`);
        }
        if (typeof target !== 'string') {
          err(errors, step.id, `onText.intentMap["${intent}"] must be a step id.`);
        }
      }
    }
  }
  const hasRoute =
    step.onText.next != null ||
    step.onText.elseNext != null ||
    intentMap != null;
  if (!hasRoute) {
    err(errors, step.id, 'onText needs at least one of next, elseNext or intentMap.');
  }
}

function checkClassify(errors, step) {
  if (step.classify == null) return;
  if (!isPlainObject(step.classify)) {
    err(errors, step.id, 'classify must be an object.');
    return;
  }
  const categories = step.classify.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    err(errors, step.id, 'classify.categories must be a non-empty array.');
    return;
  }
  if (categories.length > MAX_OPTIONS) {
    err(errors, step.id, `classify supports at most ${MAX_OPTIONS} categories.`);
  }
  const seen = new Set();
  for (const category of categories) {
    if (!isPlainObject(category) || typeof category.id !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(category.id)) {
      err(errors, step.id, 'each classify category needs an UPPER_SNAKE id.');
      continue;
    }
    if (seen.has(category.id)) {
      err(errors, step.id, `duplicate classify category "${category.id}".`);
    }
    seen.add(category.id);
    if (typeof category.description !== 'string' || category.description.trim().length === 0) {
      err(errors, step.id, `classify category "${category.id}" needs a description the AI can match on.`);
    }
    if (typeof category.next !== 'string') {
      err(errors, step.id, `classify category "${category.id}" needs a next step id.`);
    }
  }
  if (typeof step.classify.fallback !== 'string') {
    err(errors, step.id, 'classify.fallback (step id) is required for answers the AI cannot place.');
  }
}

module.exports = {
  STEP_ID_PATTERN, MAX_STEPS, MAX_TEXT_LENGTH, MAX_OPTIONS, MAX_OPTION_LABEL, TEMPLATE_PATTERN, err, isPlainObject, checkText, checkCancel, checkOptions, checkOnText, checkClassify,
};
