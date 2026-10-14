/**
 * What can start a conversation, in words a manager uses. The ids are what the bot understands (intents), taps (buttons) or does (events);
 * the labels are what the dashboard shows instead. A conversation has exactly one starter, and a starter has at most one conversation
 * (except general questions, which may have one per topic).
 */
const { INTENTS } = require('./vocabulary');

/** Intents a manager can attach a conversation to. `hidden` ones are the bot's own plumbing (unknown messages, confirmations, documents). */
const INTENT_INFO = {
  GREETING: { label: 'Says hello', hint: 'Hi, good morning, hello…' },
  SHOW_AVAILABLE_JOBS: { label: 'Asks to see available jobs', hint: '"Any jobs today?"' },
  REQUEST_JOB: { label: 'Asks for a job', hint: '"I want JOB-1042", or "give me a job". The conversation can tell which.' },
  CANCEL_JOB_REQUEST: { label: 'Withdraws a job request', hint: '"Cancel my request for JOB-1042"' },
  ACCEPT_JOB: { label: 'Accepts a job offer', hint: '"Yes, I\'ll take it"' },
  DECLINE_JOB: { label: 'Declines a job offer', hint: '"No, I can\'t do that one"' },
  START_JOB: { label: 'Says they are starting the trip', hint: '"Starting now"' },
  ARRIVED_AT_PICKUP: { label: 'Says they arrived at pickup', hint: '' },
  LOADING_STARTED: { label: 'Says loading has started', hint: '' },
  LOADED: { label: 'Says loading is finished', hint: '' },
  DEPARTED: { label: 'Says they left the pickup', hint: '' },
  ARRIVED_AT_DELIVERY: { label: 'Says they arrived at delivery', hint: '' },
  UNLOADING_STARTED: { label: 'Says unloading has started', hint: '' },
  UNLOADED: { label: 'Says unloading is finished', hint: '', hidden: true },
  DELIVERED: { label: 'Says the delivery is done', hint: '' },
  DELAY_REPORTED: { label: 'Reports a delay', hint: '"Stuck in traffic"' },
  DAMAGE_REPORTED: { label: 'Reports damaged cargo', hint: '' },
  SHORTAGE_REPORTED: { label: 'Reports missing cargo', hint: '' },
  FAILED_DELIVERY: { label: 'Says the delivery failed', hint: '"Nobody was at the gate"' },
  CANCELLATION_REQUESTED: { label: 'Asks to cancel the trip', hint: 'With or without saying why. The conversation can tell which.' },
  INCIDENT_REPORTED: { label: 'Reports an incident', hint: 'An accident, a breakdown…' },
  DOCUMENT_RECEIVED: { label: 'Sends a document', hint: '', hidden: true },
  END_JOB: { label: 'Says the job is finished', hint: '"Job done, closing it"' },
  CONFIRM_EVENT: { label: 'Says yes to a question', hint: '', hidden: true },
  CORRECT_EVENT: { label: 'Corrects what the bot understood', hint: '', hidden: true },
  ASK_HISTORY: { label: 'Asks about past jobs', hint: '' },
  ASK_IDENTITY: { label: 'Asks who the bot is', hint: '' },
  ASK_PROGRESS: { label: 'Asks how the trip is going', hint: '' },
  GENERAL_QUESTION: { label: 'Asks a general question', hint: 'Working hours, pay days, depot address… One conversation per topic.' },
  HELP: { label: 'Asks for help', hint: '' },
  UNKNOWN: { label: 'Says something the bot does not understand', hint: '', hidden: true },
};

/** What the bot does by itself that can start a conversation. Managers cannot create these, only edit the built-in ones. */
const EVENT_INFO = {
  'candidate.confirmation.required': { label: 'The bot is not sure it understood and asks the driver to confirm' },
  'candidate.clarification.required': { label: 'The bot did not understand and asks the driver to say it again' },
  'freeform.question.asked': { label: 'The driver asks an open question the bot has no ready answer for' },
  'incident.safety.required': { label: 'A driver reports an incident and the bot runs the safety check' },
  'delay.reason.required': { label: 'A pickup or delivery was late and the bot asks why' },
  'job.start-confirm.required': { label: 'The driver starts a trip long after its scheduled time and the bot asks to confirm' },
};

/** The buttons the bot already sends, in words. A button belongs to one conversation. */
const BUTTON_INFO = [
  { match: 'CHOOSE_JOB:', label: 'Taps a job from a list' },
  { match: 'APPLY_JOB', label: 'Taps "Apply now" on a job invite' },
  { match: 'ACCEPT_JOB', label: 'Taps Accept on a job offer' },
  { match: 'DECLINE_JOB', label: 'Taps Decline on a job offer' },
  { match: 'DOC_JOB:', label: 'Picks which job a document belongs to' },
  { match: 'GAP_START_YES', label: 'Confirms a late trip start' },
  { match: 'GAP_START_NO', label: 'Says a late trip start was a mistake' },
];

const intentLabel = (intent) => INTENT_INFO[intent]?.label ?? intent;
const eventLabel = (event) => EVENT_INFO[event]?.label ?? event;
const buttonLabel = (id) => BUTTON_INFO.find((b) => id === b.match || (b.match.endsWith(':') && String(id).startsWith(b.match)))?.label ?? `Taps the button "${id}"`;

/** The intents the dashboard offers when creating a conversation. */
const CREATABLE_INTENTS = INTENTS.filter((intent) => !INTENT_INFO[intent]?.hidden);

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

/** A one-line description of what starts a conversation, for lists. `trigger` is { triggerType, triggerConfig }. */
function describeTrigger({ triggerType, triggerConfig }) {
  const cfg = triggerConfig ?? {};
  if (triggerType === 'INTENT') return `Driver ${lowerFirst(intentLabel(cfg.intent))}${cfg.topic ? ` about "${cfg.topic}"` : ''}`;
  if (triggerType === 'BUTTON') {
    const ids = cfg.buttons ?? [cfg.buttonId ?? cfg.buttonPrefix].filter(Boolean);
    return `Driver ${ids.map((id) => lowerFirst(buttonLabel(id))).join(' or ')}`;
  }
  return eventLabel(cfg.event);
}

module.exports = { INTENT_INFO, EVENT_INFO, BUTTON_INFO, CREATABLE_INTENTS, intentLabel, eventLabel, buttonLabel, describeTrigger };
