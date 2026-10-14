/**
 * Names of the whitelisted flow actions and prompt providers.
 *
 * Actions are the only way a flow can touch the system: managers pick them
 * from a dropdown in the dashboard, they can never write code. The
 * implementations live in the WhatsApp interface (interfaces/whatsapp/flows); this
 * module lists only the names so the flows module can validate definitions
 * without depending on the interface.
 */

/** What the AI can understand a driver to mean. A flow can start on any of these; the WhatsApp interface's interpreter answers with one. */
const INTENTS = [
  "GREETING",
  "SHOW_AVAILABLE_JOBS",
  "REQUEST_JOB",
  "CANCEL_JOB_REQUEST",
  "ACCEPT_JOB",
  "DECLINE_JOB",
  "START_JOB",
  "ARRIVED_AT_PICKUP",
  "LOADING_STARTED",
  "LOADED",
  "DEPARTED",
  "ARRIVED_AT_DELIVERY",
  "UNLOADING_STARTED",
  "UNLOADED",
  "DELIVERED",
  "DELAY_REPORTED",
  "DAMAGE_REPORTED",
  "SHORTAGE_REPORTED",
  "FAILED_DELIVERY",
  "CANCELLATION_REQUESTED",
  "INCIDENT_REPORTED",
  "DOCUMENT_RECEIVED",
  "END_JOB",
  "CONFIRM_EVENT",
  "CORRECT_EVENT",
  "ASK_HISTORY",
  "ASK_IDENTITY",
  "ASK_PROGRESS",
  "GENERAL_QUESTION",
  "HELP",
  "UNKNOWN",
];

/**
 * What an IF step can look at: facts the bot already has when a conversation starts. The checks themselves are in runtime/match.js
 * (CONDITION_TESTS); a test keeps both lists the same.
 */
const CONDITION_LABELS = {
  driver_gave_job_number: 'the driver already named a job',
  driver_gave_reason: 'the driver already gave a reason',
};
const CONDITION_NAMES = Object.keys(CONDITION_LABELS);

const ACTION_NAMES = [
  'beginCancellation',
  'recordDelayReason',
  'safetyRecordLocation',
  'safetyRecordBackup',
  'safetyComplete',
  'confirmStartAndContinue',
  'endJobGuarded',
  'requestJobById',
  'requestJobByNumber',
  'attachDocumentsFromChoice',
  'applyCandidateConfirmed',
  'mergeCorrection',
  'routeCandidatePassthrough',
  'sendClarification',
  'submitApplyRequestSmart',
  'respondOffer',
  'gapStartRespond',
  'answerFreeform',
  'recordEvidence',
];

/** Human-facing labels for the dashboard action dropdown. */
const ACTION_LABELS = {
  beginCancellation: 'Request trip cancellation (manager review)',
  recordDelayReason: 'Record a stage delay reason',
  safetyRecordLocation: 'Safety check: save driver location',
  safetyRecordBackup: 'Safety check: save backup-vehicle choice',
  safetyComplete: 'Safety check: finish and alert manager',
  confirmStartAndContinue: 'Confirm job start and continue',
  endJobGuarded: 'Send job for closure (with safety checks)',
  requestJobById: 'Request a job by id',
  requestJobByNumber: 'Request a job by job number',
  attachDocumentsFromChoice: 'Attach pending documents to a job',
  applyCandidateConfirmed: 'Apply a confirmed driver update',
  mergeCorrection: 'Merge a correction and ask again',
  routeCandidatePassthrough: 'Continue normal message routing',
  sendClarification: 'Send a clarifying question',
  submitApplyRequestSmart: 'Apply for an invited job',
  respondOffer: 'Answer a job offer (accept/decline)',
  gapStartRespond: 'Answer a trip-start gap prompt',
  answerFreeform: 'Answer an open question with AI',
  recordEvidence: 'Save the answer as evidence (confirmation, note, location or photo)',
};

const PROMPT_PROVIDER_NAMES = [
  'delayReasonPrompt',
  'startConfirmPrompt',
  'candidateConfirmationPrompt',
  'availableJobsPrompt',
];

const PROMPT_PROVIDER_LABELS = {
  delayReasonPrompt: 'Delay reason question (dynamic)',
  startConfirmPrompt: 'Start confirmation question (dynamic)',
  candidateConfirmationPrompt: 'Update confirmation summary (dynamic)',
  availableJobsPrompt: 'Available jobs list (dynamic options)',
};

module.exports = {
  INTENTS,
  ACTION_NAMES,
  ACTION_LABELS,
  PROMPT_PROVIDER_NAMES,
  PROMPT_PROVIDER_LABELS,
  CONDITION_LABELS,
  CONDITION_NAMES,
};
