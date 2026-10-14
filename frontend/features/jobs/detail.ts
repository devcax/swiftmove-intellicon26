// ---------------------------------------------------------------------------
// Pure helpers for the job detail view: formatting, status/progress
// derivation and timeline-event presentation. No React, no side effects -
// every function depends only on its arguments so it can be unit-tested.
// ---------------------------------------------------------------------------

import type { ApiJobDetail, ApiTimelineEvent } from "./types";
import type { EventDataPayload, Provenance } from "@/types/job";
import type { ToneColor } from "@/types/ui";
import { LADDER_RANK } from "./workflow";
import { fmtDateTime } from "@/lib/format";

/** Data keys that drive provenance badges rather than plain detail chips. */
const PROVENANCE_KEYS = new Set([
  "inferred",
  "inferred_by",
  "correction",
  "verification",
  "reason",
]);

/** Tone for an interpreted intent based on its review status. */
export function intentTone(status: string): ToneColor {
  if (status === "REQUIRES_REVIEW") return { bg: "#fef3c7", fg: "#b45309" };
  if (status === "FAILED") return { bg: "#fee2e2", fg: "#b91c1c" };
  return { bg: "#e0e7ff", fg: "#4338ca" };
}

/** Format an ISO timestamp for display, or an em dash when absent. */
export function fmtTime(iso: string | null): string {
  return fmtDateTime(iso, "—");
}

/**
 * Resolve the status to display. A manager-approved job whose assignment is
 * still awaiting driver acceptance shows the assignment status instead.
 */
export function latestStatus(
  status: string,
  assignmentStatus: string | null | undefined,
): string {
  if (status === "MANAGER_APPROVED" && assignmentStatus === "PENDING_DRIVER_ACCEPTANCE") {
    return assignmentStatus;
  }
  return status;
}

/**
 * Derive the job's position on the progress ladder. Prefers the explicit
 * status rank, otherwise reconstructs progress from assignment timestamps and
 * applied/confirmed timeline events.
 */
export function progressRank(job: ApiJobDetail, timeline: ApiTimelineEvent[]): number {
  const directRank = LADDER_RANK[job.status];
  if (directRank != null) return directRank;

  let rank = job.assignment ? LADDER_RANK.ASSIGNED : LADDER_RANK.PUBLISHED;
  if (job.assignment?.startedAt) rank = LADDER_RANK.IN_PROGRESS;
  if (job.pickupActualAt) rank = Math.max(rank, LADDER_RANK.ARRIVED_AT_PICKUP);
  if (job.pickupVerifiedAt) rank = Math.max(rank, LADDER_RANK.LOADED);
  if (job.deliveryActualAt) rank = Math.max(rank, LADDER_RANK.ARRIVED_AT_DELIVERY);
  if (job.deliveryVerifiedAt) rank = Math.max(rank, LADDER_RANK.DELIVERED);

  for (const event of timeline) {
    if (event.status !== "APPLIED" && event.status !== "CONFIRMED") continue;
    const eventRank = event.type === "START_JOB"
      ? LADDER_RANK.IN_PROGRESS
      : LADDER_RANK[event.type];
    if (eventRank != null) rank = Math.max(rank, eventRank);
  }

  return rank;
}

/** Plain "key: value" detail strings from an event payload, minus provenance keys. */
export function eventDetails(data: Record<string, unknown>): string[] {
  return Object.entries(data ?? {})
    .filter(([k, v]) => v != null && v !== "" && !PROVENANCE_KEYS.has(k))
    .map(
      ([k, v]) =>
        `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`,
    );
}

/** Provenance badge for an event, or null when it was reported directly. */
export function eventProvenance(data: Record<string, unknown>): Provenance | null {
  const d = (data ?? {}) as EventDataPayload;
  if (d.verification) {
    return {
      label: `${(d.verification.stage ?? "").toLowerCase()} code verified`,
      bg: "#dcfce7",
      fg: "#15803d",
      title:
        "Confirmed automatically by matching the document code stored for this job",
    };
  }
  if (d.inferred) {
    return {
      label: "auto-filled",
      bg: "#e0e7ff",
      fg: "#4338ca",
      title: d.reason
        ? `Recorded by the system because it must logically have happened (${d.reason})`
        : "Recorded by the system because it must logically have happened",
    };
  }
  if (d.correction) {
    return {
      label: "correction",
      bg: "#fef3c7",
      fg: "#b45309",
      title: "The driver corrected the job back to this state",
    };
  }
  return null;
}

/** Positive delay in minutes between a scheduled and actual timestamp. */
export function stageDelayMinutes(
  scheduled: string | null,
  actual: string | null,
): number | null {
  if (!scheduled || !actual) return null;
  const minutes = Math.round(
    (new Date(actual).getTime() - new Date(scheduled).getTime()) / 60000,
  );
  return minutes > 0 ? minutes : null;
}

/** Human-readable duration for a delay expressed in minutes. */
export function fmtDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
