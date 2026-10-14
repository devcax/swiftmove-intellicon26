// ---------------------------------------------------------------------------
// Static vocabularies for the policy dashboard. The dynamic catalogs
// (actions, capabilities) come from the backend; these are the fixed option
// lists the backend DSL accepts (sources, actors, milestones, ...).
// ---------------------------------------------------------------------------

import type { ApiPolicyBlockMode } from "@/features/policies/types";

export const BLOCK_MODE_META: Record<
  ApiPolicyBlockMode,
  { label: string; description: string }
> = {
  BLOCK: {
    label: "Stop the action",
    description: "The action is refused until the requirement is met.",
  },
  WARN: {
    label: "Allow with a warning",
    description: "The action goes ahead; the warning is shown and recorded.",
  },
  ESCALATE: {
    label: "Stop and alert a manager",
    description: "The action is refused and the manager team is notified.",
  },
};

/** Where an action can come from (policy `match.source`). */
export const POLICY_SOURCES = ["CHAT", "DOCUMENT", "MANAGER", "API", "TIMER"] as const;

/** Who performs an action (policy `match.actor`). */
export const POLICY_ACTORS = ["DRIVER", "MANAGER", "SYSTEM"] as const;

/** Milestones a driver can report (policy `match.milestone` on trip.milestone). */
export const MILESTONE_OPTIONS = [
  "IN_PROGRESS",
  "ARRIVED_AT_PICKUP",
  "LOADING_STARTED",
  "LOADED",
  "DEPARTED",
  "ARRIVED_AT_DELIVERY",
  "UNLOADING_STARTED",
  "DELIVERED",
] as const;

/** Document stages (policy `match.stage` on trip.verifyDocument). */
export const STAGE_OPTIONS = ["PICKUP", "DELIVERY"] as const;

/** Incident types (policy `match.incidentType` on incident.report). */
export const INCIDENT_TYPE_OPTIONS = [
  "ACCIDENT",
  "BREAKDOWN",
  "DAMAGE",
  "SHORTAGE",
  "REFUSAL",
  "OTHER",
] as const;

/** Job statuses offered as the sample situation in the simulator. */
export const SIM_JOB_STATUSES = [
  "PUBLISHED",
  "ASSIGNED",
  "IN_PROGRESS",
  "ARRIVED_AT_PICKUP",
  "LOADED",
  "DEPARTED",
  "ARRIVED_AT_DELIVERY",
  "DELIVERED",
  "DRIVER_SUBMITTED_COMPLETION",
  "COMPLETED",
  "CANCELLED",
] as const;

/**
 * Honest label for the POD distinction: a POD attachment only produces a
 * warning after closure. It is NOT a mandatory verified-document gate, and
 * the UI must never present it as one.
 */
export const POD_ATTACHMENT_NOTE =
  "Attachment check only: this sees that a photo arrived. It is not a code-verified proof " +
  "and it is not a mandatory gate — a missing POD today only adds a warning after closure.";

/** Capabilities that check an attachment rather than a verified document. */
export const ATTACHMENT_ONLY_CAPABILITIES = ["document_attached"];
