/**
 * The rules for what starts a conversation, and when two conversations would answer the same thing.
 * One starter has one conversation: an intent (except general questions, which have one per topic), a button, an event.
 */
const { INTENTS } = require('./vocabulary');
const { EVENT_INFO, intentLabel, buttonLabel, eventLabel } = require('./triggerCatalog');
const { validateTriggerTopic, intentTriggersClash } = require('./flowValidate');

const KEY_PATTERN = /^[a-z0-9][a-z0-9.-]{1,60}$/;

/** { value } for a valid trigger, { error } with the message the dashboard shows otherwise. Older saved flows may carry a `when`; it is dropped. */
function validateTriggerConfig(triggerType, triggerConfig) {
  if (triggerType === 'INTENT') {
    const { intent } = triggerConfig ?? {};
    if (!INTENTS.includes(intent)) return { error: `intent must be one of: ${INTENTS.join(', ')}.` };
    const topicCheck = validateTriggerTopic(intent, triggerConfig?.topic);
    if (topicCheck.error) return { error: topicCheck.error };
    return { value: { intent, ...(topicCheck.value ? { topic: topicCheck.value } : {}) } };
  }
  if (triggerType === 'BUTTON') {
    const { buttonId, buttonPrefix, buttons } = triggerConfig ?? {};
    const shapes = [buttonId != null, buttonPrefix != null, buttons != null].filter(Boolean).length;
    if (shapes !== 1) return { error: 'Provide exactly one of buttonId, buttonPrefix or buttons.' };
    if (buttonId != null && (typeof buttonId !== 'string' || buttonId.length > 128)) return { error: 'buttonId must be a string up to 128 characters.' };
    if (buttonPrefix != null && (typeof buttonPrefix !== 'string' || buttonPrefix.length > 64)) return { error: 'buttonPrefix must be a string up to 64 characters.' };
    if (buttons != null && (!Array.isArray(buttons) || buttons.length === 0 || buttons.length > 10 || buttons.some((b) => typeof b !== 'string' || b.length > 128))) {
      return { error: 'buttons must be an array of 1-10 button id strings.' };
    }
    return { value: { ...(buttonId ? { buttonId } : {}), ...(buttonPrefix ? { buttonPrefix } : {}), ...(buttons ? { buttons } : {}) } };
  }
  return { error: 'triggerType must be INTENT or BUTTON. (Conversations the bot starts by itself are built-in only.)' };
}

/** What this starter is, in words, for the message that says it is taken. */
function describeStarter(triggerType, triggerConfig) {
  if (triggerType === 'INTENT') return `"${intentLabel(triggerConfig.intent)}"${triggerConfig.topic ? ` about "${triggerConfig.topic}"` : ''}`;
  if (triggerType === 'BUTTON') return `"${buttonLabel(triggerConfig.buttonId ?? triggerConfig.buttonPrefix ?? (triggerConfig.buttons ?? [])[0])}"`;
  return `"${eventLabel(triggerConfig.event)}"`;
}

const buttonIdsOf = (cfg) => cfg.buttons ?? [cfg.buttonId ?? cfg.buttonPrefix].filter(Boolean);
/** Two button starters clash when one id (or prefix) covers the other. */
const buttonsClash = (a, b) => buttonIdsOf(a).some((x) => buttonIdsOf(b).some((y) => x.startsWith(y) || y.startsWith(x)));

/** The other conversation (latest version of each, `others`) that answers the same starter, or null. */
function findTriggerClash(others, triggerType, triggerConfig) {
  for (const row of others) {
    if (row.triggerType !== triggerType) continue;
    const cfg = row.triggerConfig ?? {};
    if (triggerType === 'INTENT' && intentTriggersClash(cfg, triggerConfig)) return row;
    if (triggerType === 'BUTTON' && buttonsClash(cfg, triggerConfig)) return row;
    if (triggerType === 'EVENT' && cfg.event === triggerConfig.event) return row;
  }
  return null;
}

/** The sentence the dashboard shows when a starter already has a conversation. */
const clashMessage = (clash, triggerType, triggerConfig) =>
  `${describeStarter(triggerType, triggerConfig)} already starts the conversation "${clash.name ?? clash.key}". Edit that one, or turn it off first: one starter can only have one conversation.`;

module.exports = { KEY_PATTERN, EVENT_INFO, validateTriggerConfig, findTriggerClash, clashMessage };
