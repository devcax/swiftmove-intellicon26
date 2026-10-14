const STAGE_RANK = {
  PUBLISHED: 0,
  DRIVER_REQUESTED: 1,
  MANAGER_APPROVED: 2,
  ASSIGNMENT_SENT: 2,
  ASSIGNED: 5,
  IN_PROGRESS: 10,
  ARRIVED_AT_PICKUP: 20,
  LOADING_STARTED: 30,
  LOADED: 40,
  DEPARTED: 50,
  ARRIVED_AT_DELIVERY: 60,
  UNLOADING_STARTED: 70,
  UNLOADED: 80,
  DELIVERED: 90,
  DELIVERED_WITH_EXCEPTION: 90,
  DRIVER_SUBMITTED_COMPLETION: 95,
  MANAGER_REVIEW: 96,
  REQUIRES_CORRECTION: 95,
  COMPLETED: 100,
};

const MILESTONE_RANK = {
  IN_PROGRESS: 10,
  ARRIVED_AT_PICKUP: 20,
  LOADING_STARTED: 30,
  LOADED: 40,
  DEPARTED: 50,
  ARRIVED_AT_DELIVERY: 60,
  UNLOADING_STARTED: 70,
  DELIVERED: 90,
};

const MILESTONE_EVENTS = Object.keys(MILESTONE_RANK).filter((status) => status !== 'IN_PROGRESS');

const AUTOFILL_CHAIN = [
  'ARRIVED_AT_PICKUP',
  'LOADED',
  'DEPARTED',
  'ARRIVED_AT_DELIVERY',
  'DELIVERED',
];

const PROTECTED_MILESTONES = ['ASSIGNED', 'IN_PROGRESS', 'LOADED', 'DELIVERED', 'COMPLETED'];
const PROTECTED_RANKS = PROTECTED_MILESTONES.map((s) => STAGE_RANK[s]).sort((a, b) => a - b);

const DOCUMENT_VERIFIED_MILESTONES = {
  LOADED: 'PICKUP',
  DELIVERED: 'DELIVERY',
};

const FROZEN_STATUSES = ['COMPLETED', 'CANCELLED'];

/** The statuses of a job that is in progress for the dispatcher: approved, on the road, or waiting to be closed. */
const LIVE_STATUSES = [
  'MANAGER_APPROVED', 'ASSIGNMENT_SENT', 'ASSIGNED', 'IN_PROGRESS',
  'ARRIVED_AT_PICKUP', 'LOADING_STARTED', 'LOADED', 'DEPARTED',
  'ARRIVED_AT_DELIVERY', 'UNLOADING_STARTED', 'UNLOADED',
  'DELAYED', 'INCIDENT_OPEN', 'CANCELLATION_REVIEW',
  'DELIVERED', 'DELIVERED_WITH_EXCEPTION',
  'DRIVER_SUBMITTED_COMPLETION', 'MANAGER_REVIEW', 'REQUIRES_CORRECTION',
];

const SIDE_STATUSES = ['DELAYED', 'INCIDENT_OPEN', 'CANCELLATION_REVIEW', 'FAILED_DELIVERY'];

const STAGE_LABEL = {
  PUBLISHED: 'published',
  DRIVER_REQUESTED: 'requested',
  MANAGER_APPROVED: 'approved',
  ASSIGNMENT_SENT: 'offered to you',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'started',
  ARRIVED_AT_PICKUP: 'at pickup',
  LOADING_STARTED: 'loading',
  LOADED: 'loaded',
  DEPARTED: 'departed',
  ARRIVED_AT_DELIVERY: 'at delivery',
  UNLOADING_STARTED: 'unloading',
  UNLOADED: 'unloaded',
  DELIVERED: 'delivered',
  DELIVERED_WITH_EXCEPTION: 'delivered with an exception',
  DRIVER_SUBMITTED_COMPLETION: 'sent for closure',
  MANAGER_REVIEW: 'in closure review',
  REQUIRES_CORRECTION: 'waiting for a correction',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DELAYED: 'delayed',
  INCIDENT_OPEN: 'on hold after an incident',
  CANCELLATION_REVIEW: 'in cancellation review',
  FAILED_DELIVERY: 'a failed delivery',
};

function label(status) {
  return STAGE_LABEL[status] ?? String(status ?? '').replace(/_/g, ' ').toLowerCase();
}

function nextStepHint(status) {
  switch (status) {
    case 'ASSIGNED':
      return 'Next is starting the trip, then heading to pickup.';
    case 'IN_PROGRESS':
      return 'Next is arriving at pickup.';
    case 'ARRIVED_AT_PICKUP':
    case 'LOADING_STARTED':
      return 'The next confirmed milestone is loaded, which is set once your pickup document code is verified. Send a photo of the pickup document when you have it.';
    case 'LOADED':
      return 'Next is departing from pickup.';
    case 'DEPARTED':
      return 'Next is arriving at delivery.';
    case 'ARRIVED_AT_DELIVERY':
    case 'UNLOADING_STARTED':
      return 'Next is unloading, then the delivery document photo so the delivery code can be verified.';
    case 'UNLOADED':
      return 'The next confirmed milestone is delivered, which is set once your delivery document code is verified. Send a photo of the delivery document.';
    case 'DELIVERED':
    case 'DELIVERED_WITH_EXCEPTION':
      return 'Delivery is confirmed. Send the job for closure when you are ready and the manager will approve it.';
    case 'DRIVER_SUBMITTED_COMPLETION':
    case 'MANAGER_REVIEW':
      return 'The manager is reviewing the closure request now.';
    case 'REQUIRES_CORRECTION':
      return 'The manager asked for a correction. Send the corrected update or document here.';
    case 'COMPLETED':
      return 'This job is closed. You are free for the next one.';
    default:
      return null;
  }
}


function rankOf(status) {
  return STAGE_RANK[status] ?? null;
}

function isSideStatus(status) {
  return SIDE_STATUSES.includes(status);
}

function isFrozen(status) {
  return FROZEN_STATUSES.includes(status);
}

function protectionFloor(rank, protectedRanks = PROTECTED_RANKS) {
  let floor = -1;
  for (const r of protectedRanks) {
    if (rank >= r) floor = r;
  }
  return floor;
}

function floorMilestone(floor, protectedMilestones = PROTECTED_MILESTONES) {
  return protectedMilestones.find((milestone) => STAGE_RANK[milestone] === floor) ?? null;
}

function requiresDocumentVerification(milestone, documentGates = DOCUMENT_VERIFIED_MILESTONES) {
  return Boolean(documentGates[milestone]);
}

function verificationStageFor(milestone, documentGates = DOCUMENT_VERIFIED_MILESTONES) {
  return documentGates[milestone] ?? null;
}

/**
 * Guards that planTransition enforces. Callers (via guardConfig) can inject
 * dashboard-configured values; anything omitted falls back to the constants
 * above, which reproduce the original hardcoded behavior.
 */
function normalizeGuards(guards) {
  const documentGates = guards?.documentGates ?? DOCUMENT_VERIFIED_MILESTONES;
  const protectedMilestones = guards?.protectedMilestones ?? PROTECTED_MILESTONES;
  return {
    documentGates,
    protectedMilestones,
    protectedRanks: protectedMilestones
      .map((s) => STAGE_RANK[s])
      .filter((r) => r != null)
      .sort((a, b) => a - b),
    frozenStatuses: guards?.frozenStatuses ?? FROZEN_STATUSES,
    requireStartConfirmation: guards?.requireStartConfirmation ?? true,
  };
}

function inferredStatesBetween(fromRank, target) {
  const targetRank = MILESTONE_RANK[target];
  if (targetRank == null) return [];
  return AUTOFILL_CHAIN.filter((s) => MILESTONE_RANK[s] > fromRank && MILESTONE_RANK[s] < targetRank);
}

function planTransition({ currentStatus, currentRank, target, source = 'CHAT' }, guards = null) {
  const g = normalizeGuards(guards);
  const block = (code, reason) => ({ kind: 'BLOCKED', allowed: false, inferred: [], reason, code });

  const targetRank = MILESTONE_RANK[target];
  if (targetRank == null) {
    return block('NOT_A_MILESTONE', `${target} is not a trip milestone.`);
  }

  if (g.frozenStatuses.includes(currentStatus)) {
    return block(
      'JOB_FROZEN',
      currentStatus === 'COMPLETED'
        ? 'This job is already completed and closed, so its status cannot change.'
        : 'This job is cancelled, so its status cannot change.'
    );
  }

  if (source === 'CHAT' && requiresDocumentVerification(target, g.documentGates) && targetRank > currentRank) {
    return block(
      'VERIFICATION_REQUIRED',
      verificationStageFor(target, g.documentGates) === 'PICKUP'
        ? 'Loaded is confirmed by the pickup document code, so the pickup document has to be uploaded first.'
        : 'Delivered is confirmed by the delivery document code, so the delivery document has to be uploaded first.'
    );
  }

  if (
    g.requireStartConfirmation &&
    source !== 'MANAGER' &&
    currentRank < STAGE_RANK.IN_PROGRESS &&
    targetRank > STAGE_RANK.IN_PROGRESS
  ) {
    return block(
      'START_CONFIRMATION_REQUIRED',
      'This job has not been marked as started yet. The driver has to confirm the start explicitly first.'
    );
  }

  if (targetRank === currentRank) {
    return { kind: 'NOOP', allowed: false, inferred: [], reason: null, code: 'ALREADY_AT_STATE' };
  }

  if (targetRank > currentRank) {
    const inferred = inferredStatesBetween(currentRank, target);

    const skippedGate = inferred.find((s) => requiresDocumentVerification(s, g.documentGates));
    if (skippedGate && source !== 'MANAGER') {
      return block(
        'VERIFICATION_REQUIRED',
        verificationStageFor(skippedGate, g.documentGates) === 'PICKUP'
          ? 'The pickup still has to be confirmed by the pickup document code before the job can move this far. Send a photo of the pickup document.'
          : 'The delivery still has to be confirmed by the delivery document code first.'
      );
    }

    return {
      kind: inferred.length > 0 ? 'FORWARD_WITH_INFERRED' : 'FORWARD',
      allowed: true,
      inferred,
      reason: null,
      code: null,
    };
  }

  if (source === 'MANAGER') {
    return { kind: 'BACKWARD', allowed: true, inferred: [], reason: null, code: null };
  }

  const floor = protectionFloor(currentRank, g.protectedRanks);
  if (targetRank < floor) {
    const milestone = floorMilestone(floor, g.protectedMilestones);
    return block(
      'PROTECTED_MILESTONE',
      `This job is already confirmed as ${label(milestone)}, so it cannot go back to ${label(target)}.`
    );
  }

  return { kind: 'BACKWARD', allowed: true, inferred: [], reason: null, code: null };
}

function planVerifiedTransition({ currentStatus, currentRank, stage }, guards = null) {
  const target = stage === 'PICKUP' ? 'LOADED' : 'DELIVERED';
  return { target, ...planTransition({ currentStatus, currentRank, target, source: 'DOCUMENT' }, guards) };
}

module.exports = {
  STAGE_RANK,
  MILESTONE_RANK,
  MILESTONE_EVENTS,
  AUTOFILL_CHAIN,
  PROTECTED_MILESTONES,
  DOCUMENT_VERIFIED_MILESTONES,
  FROZEN_STATUSES,
  LIVE_STATUSES,
  SIDE_STATUSES,
  STAGE_LABEL,
  label,
  nextStepHint,
  rankOf,
  isSideStatus,
  isFrozen,
  protectionFloor,
  floorMilestone,
  requiresDocumentVerification,
  verificationStageFor,
  normalizeGuards,
  inferredStatesBetween,
  planTransition,
  planVerifiedTransition,
};
