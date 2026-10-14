/** The thresholds and groupings the conversation code decides with. */
const config = require("../../platform/config");
const stateMachine = require("../../platform/jobStateMachine");

const AUTO_APPLY_MIN = config.aiAutoApplyMin;
const CLARIFY_MIN = config.aiClarifyMin;

const MILESTONE_SET = new Set(stateMachine.MILESTONE_EVENTS);

// What the driver can ask for that changes a job: these are confirmed first when the model is unsure.
const STATE_CHANGING = new Set([
  "REQUEST_JOB",
  "CANCEL_JOB_REQUEST",
  "ACCEPT_JOB",
  "DECLINE_JOB",
  "START_JOB",
  ...stateMachine.MILESTONE_EVENTS,
  "END_JOB",
]);

// What a handler returns when it did not take the message and the next one should: no reply was sent, nothing was decided.
const CONTINUE = Symbol("continue");

module.exports = { AUTO_APPLY_MIN, CLARIFY_MIN, MILESTONE_SET, STATE_CHANGING, CONTINUE };
