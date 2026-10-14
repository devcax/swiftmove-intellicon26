/**
 * Policy seeds — the database-backed replacement for every editable or
 * hardcoded business rule found in the audit (docs/policy-migration-map.md).
 *
 * buildPolicySeeds() gives the built-in policies with the compiled defaults, which reproduce the behavior the system had before policies were data.
 *
 * The same list doubles as the runtime fail-safe: when the policy tables are
 * not readable (migration not applied yet), the store serves these defaults
 * so behavior never changes mid-deploy.
 *
 * Evaluation order within one action is controlled by `position` and
 * reproduces the precedence of the old hardcoded checks exactly:
 *   trip.milestone: frozen(10) → direct doc gate(20) → start confirmation(30)
 *     → skipped doc gate(40) → protected milestones(50)
 *   trip.verifyDocument: frozen(10) → pickup-before-delivery(20)
 */
const { GUARD_DEFAULTS } = require('./guardDefaults');

/** Was the START_WINDOW_MS constant in workflow.js (24 hours before pickup). */
const START_WINDOW_HOURS = 24;
/** Was the inline schedule check in routes/jobs.js (delivery within 2 days). */
const SCHEDULE_LIMIT_DAYS = 2;
/** Stages that record lateness and require a delay reason (workflow.js). */
const DELAY_REASON_STAGES = ['PICKUP', 'DELIVERY'];

function gateway({ key, name, description, action, position, match = {}, rule, onBlock = { mode: 'BLOCK' }, enabled = true }) {
  return {
    key,
    name,
    description,
    action,
    enforcement: 'GATEWAY',
    match,
    rule,
    onBlock,
    position,
    enabled,
    isSystem: true,
  };
}

function setting({ key, name, description, action, payload, enabled = true }) {
  return {
    key,
    name,
    description,
    action,
    enforcement: 'SETTING',
    match: {},
    rule: { setting: payload },
    onBlock: { mode: 'BLOCK' },
    position: 100,
    enabled,
    isSystem: true,
  };
}

function buildPolicySeeds() {
  const guards = GUARD_DEFAULTS;
  const gateEntries = Object.entries(guards.documentGates);
  const hasGates = gateEntries.length > 0;
  const hasFrozen = guards.frozenStatuses.length > 0;
  const hasProtected = guards.protectedMilestones.length > 0;

  return [
    // ------------------------------------------------------- trip.milestone
    gateway({
      key: 'trip.frozen-statuses',
      name: 'Closed jobs never change status',
      description:
        'Jobs in one of the frozen statuses are closed: no milestone, document or correction can move them anymore.',
      action: 'trip.milestone',
      position: 10,
      rule: { requirement: 'job_not_frozen', params: { statuses: guards.frozenStatuses } },
      enabled: hasFrozen,
    }),
    gateway({
      key: 'milestone.document-gates',
      name: 'Gated milestones need a verified document',
      description:
        'Loaded is confirmed by the verified pickup document and Delivered by the verified delivery document; ' +
        'a driver cannot simply claim these milestones in chat.',
      action: 'trip.milestone',
      position: 20,
      rule: { requirement: 'document_gates_respected', params: { gates: guards.documentGates, phase: 'direct' } },
      enabled: hasGates,
    }),
    gateway({
      key: 'trip.start-confirmation',
      name: 'Driver must explicitly start the trip',
      description: 'Progress updates are blocked until the driver has explicitly confirmed the start of the job.',
      action: 'trip.milestone',
      position: 30,
      rule: { requirement: 'trip_started_explicit' },
      onBlock: { mode: 'BLOCK', flowKey: 'job.start-confirm' },
      enabled: guards.requireStartConfirmation,
    }),
    gateway({
      key: 'milestone.no-skipped-gates',
      name: 'Trips cannot skip an unverified document gate',
      description:
        'A progress update that would jump past an unverified pickup/delivery document gate is refused until the document is verified.',
      action: 'trip.milestone',
      position: 40,
      rule: { requirement: 'document_gates_respected', params: { gates: guards.documentGates, phase: 'skipped' } },
      enabled: hasGates,
    }),
    gateway({
      key: 'trip.protected-milestones',
      name: 'Confirmed milestones cannot be rolled back',
      description:
        'Once any of these milestones is confirmed, the job cannot be moved back to an earlier stage (managers may still correct it).',
      action: 'trip.milestone',
      position: 50,
      rule: { requirement: 'not_reversing_protected', params: { milestones: guards.protectedMilestones } },
      enabled: hasProtected,
    }),

    // ------------------------------------------------------- trip.verifyDocument
    gateway({
      key: 'document.frozen-statuses',
      name: 'Closed jobs do not accept documents',
      description: 'Documents for a completed or cancelled job can no longer change its status.',
      action: 'trip.verifyDocument',
      position: 10,
      rule: { requirement: 'job_not_frozen', params: { statuses: guards.frozenStatuses } },
      enabled: hasFrozen,
    }),
    gateway({
      key: 'document.pickup-before-delivery',
      name: 'Pickup document before delivery document',
      description: 'The delivery document is rejected until the pickup document has been verified first.',
      action: 'trip.verifyDocument',
      position: 20,
      match: { stage: 'DELIVERY' },
      rule: { requirement: 'document_verified', params: { stage: 'PICKUP' } },
      enabled: guards.pickupBeforeDeliveryDoc,
    }),

    // ------------------------------------------------------------- trip.start
    gateway({
      key: 'trip.start-window',
      name: 'Trip start window',
      description: 'The driver can only confirm the trip start within this many hours before the scheduled pickup.',
      action: 'trip.start',
      position: 10,
      rule: { requirement: 'started_within_hours_of_pickup', params: { hours: START_WINDOW_HOURS } },
    }),

    // ---------------------------------------------------------- request.submit
    gateway({
      key: 'job.request-eligibility',
      name: 'Who can request a job',
      description:
        'A driver can request a job when they have no active job, the job is open, the pickup is within the ' +
        'request window, and the driver was not released from this job before.',
      action: 'request.submit',
      position: 10,
      rule: {
        all: [
          { requirement: 'driver_available' },
          { requirement: 'job_accepting_requests' },
          { requirement: 'pickup_within_hours', params: { hours: guards.jobRequestWindowHours } },
          { requirement: 'driver_not_released' },
        ],
      },
    }),

    // -------------------------------------------------------------- job.requestClosure
    gateway({
      key: 'closure.requires-delivery',
      name: 'Only delivered jobs go for closure',
      description: 'A job can only be sent for closure approval after the delivery is confirmed.',
      action: 'job.requestClosure',
      position: 10,
      // The driver's request. The timer only asks for jobs that are already delivered, and its own rules carry actor SYSTEM.
      match: { actor: { in: ['DRIVER'] } },
      rule: { requirement: 'job_rank_at_least', params: { status: 'DELIVERED' } },
    }),
    gateway({
      key: 'incident.safety-followup.closure',
      name: 'Safety check before closure',
      description:
        'After an accident or critical incident the driver finishes the short safety check before the job can be sent for closure. ' +
        'The automatic closure timer is exempt so a job never gets stuck.',
      action: 'job.requestClosure',
      position: 20,
      match: { actor: { in: ['DRIVER'] } },
      rule: { requirement: 'safety_followup_recorded' },
      onBlock: { mode: 'BLOCK', flowKey: 'incident.safety' },
    }),

    // --------------------------------------------------- trip.requestCancellation
    gateway({
      key: 'incident.safety-followup.cancellation',
      name: 'Safety check before cancellation',
      description:
        'After an accident or critical incident the driver finishes the short safety check before asking to cancel the job.',
      action: 'trip.requestCancellation',
      position: 10,
      match: { actor: { in: ['DRIVER'] } },
      rule: { requirement: 'safety_followup_recorded' },
      onBlock: { mode: 'BLOCK', flowKey: 'incident.safety' },
    }),

    // ------------------------------------------------------- incident.report
    gateway({
      key: 'incident.duplicate-handling',
      name: 'Duplicate incidents are merged',
      description:
        'Reporting the same kind of incident twice on one job does not create a second record; ' +
        'the driver is told the manager already has it.',
      action: 'incident.report',
      position: 10,
      rule: { requirement: 'no_duplicate_open_incident' },
      onBlock: { mode: 'WARN' },
    }),

    // ------------------------------------------------------------ job.create
    gateway({
      key: 'job.schedule-limit',
      name: 'Delivery schedule limit',
      description: 'The scheduled delivery must be after the scheduled pickup and at most this many days later.',
      action: 'job.create',
      position: 10,
      rule: { requirement: 'delivery_within_days', params: { days: SCHEDULE_LIMIT_DAYS } },
    }),

    // ------------------------------------------------------------- SETTINGS
    setting({
      key: 'milestone.delay-reason',
      name: 'Late pickup/delivery needs a reason',
      description:
        'When a pickup or delivery is confirmed later than scheduled, the job advance waits until the driver sends a delay reason.',
      action: 'trip.verifyDocument',
      payload: { stages: DELAY_REASON_STAGES },
    }),
    setting({
      key: 'closure.auto-request',
      name: 'Auto closure delay (minutes)',
      description:
        'Minutes after the delivery is confirmed before the job is automatically sent to the manager for closure approval.',
      action: 'job.requestClosure',
      payload: { minutes: guards.autoClosureMinutes },
    }),
    setting({
      key: 'security.prompt-screening',
      name: 'Prompt-injection screening sensitivity',
      description:
        'Driver messages scoring at or above this threshold are blocked as suspected prompt-injection attempts. Lower is stricter (0 to 1).',
      action: 'conversation.receive',
      payload: { threshold: guards.promptThreshold },
    }),
    setting({
      key: 'incident.severity-floor',
      name: 'Incident severity floors',
      description:
        'The minimum severity recorded for an incident type. Accidents are always critical; unknown severities fall back to the default.',
      action: 'incident.report',
      payload: { defaultSeverity: 'HIGH', floors: { ACCIDENT: 'CRITICAL' } },
    }),
  ];
}

module.exports = {
  buildPolicySeeds,
  START_WINDOW_HOURS,
  SCHEDULE_LIMIT_DAYS,
  DELAY_REASON_STAGES,
};
