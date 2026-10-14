// ---------------------------------------------------------------------------
// Static job-workflow configuration shared by the job detail page and its
// pure helpers: the progress ladder, status ranks, tone lookups and the set
// of statuses considered "live". Moved out of the page component so the data
// is defined once and can be unit-tested without React.
// ---------------------------------------------------------------------------

import type { LadderStep } from "@/types/job";
import type { ToneColor } from "@/types/ui";

/** Ordered lifecycle milestones rendered on the progress track. */
export const LADDER: LadderStep[] = [
  { key: "PUBLISHED", label: "Published" },
  { key: "ASSIGNED", label: "Assigned", protected: true },
  { key: "IN_PROGRESS", label: "Started" },
  { key: "ARRIVED_AT_PICKUP", label: "At pickup" },
  { key: "LOADED", label: "Loaded", protected: true, verified: true },
  { key: "DEPARTED", label: "Departed" },
  { key: "ARRIVED_AT_DELIVERY", label: "At delivery" },
  {
    key: "DELIVERED",
    label: "Unloaded & Delivered",
    protected: true,
    verified: true,
  },
  { key: "DRIVER_SUBMITTED_COMPLETION", label: "Closure requested" },
  { key: "COMPLETED", label: "Completed", protected: true },
];

/** Horizontal inset (as a % of the track) so end dots align within the row. */
export const TRACK_INSET = 50 / LADDER.length;

/** Maps every backend status/alias to its index on {@link LADDER}. */
export const LADDER_RANK: Record<string, number> = {
  PUBLISHED: 0,
  DRIVER_REQUESTED: 0,
  MANAGER_APPROVED: 1,
  ASSIGNMENT_SENT: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  ARRIVED_AT_PICKUP: 3,
  LOADING_STARTED: 3,
  LOADED: 4,
  DEPARTED: 5,
  ARRIVED_AT_DELIVERY: 6,
  UNLOADING_STARTED: 6,
  UNLOADED: 7,
  DELIVERED: 7,
  DELIVERED_WITH_EXCEPTION: 7,
  DRIVER_SUBMITTED_COMPLETION: 8,
  MANAGER_REVIEW: 8,
  REQUIRES_CORRECTION: 8,
  COMPLETED: 9,
};

/** Tone lookup for a timeline event's application status. */
export const EVENT_STATUS_TONE: Record<string, ToneColor> = {
  APPLIED: { bg: "#dcfce7", fg: "#15803d" },
  CONFIRMED: { bg: "#dbeafe", fg: "#1d4ed8" },
  PROPOSED: { bg: "#e2e8f0", fg: "#475569" },
  REVIEW_REQUIRED: { bg: "#fef3c7", fg: "#b45309" },
  REJECTED: { bg: "#fee2e2", fg: "#b91c1c" },
};

/** Statuses for which a job should render with the "LIVE" indicator. */
export const LIVE_JOB_STATUSES = new Set([
  "MANAGER_APPROVED",
  "ASSIGNMENT_SENT",
  "ASSIGNED",
  "IN_PROGRESS",
  "ARRIVED_AT_PICKUP",
  "LOADING_STARTED",
  "LOADED",
  "DEPARTED",
  "ARRIVED_AT_DELIVERY",
  "UNLOADING_STARTED",
  "UNLOADED",
  "DELAYED",
  "INCIDENT_OPEN",
  "CANCELLATION_REVIEW",
  "DELIVERED",
  "DELIVERED_WITH_EXCEPTION",
  "DRIVER_SUBMITTED_COMPLETION",
  "MANAGER_REVIEW",
  "REQUIRES_CORRECTION",
]);
