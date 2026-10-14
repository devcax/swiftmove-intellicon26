// ---------------------------------------------------------------------------
// Static configuration for the job-request queue page: the closure status
// filter, request-type badge tones and the shared table styling.
// ---------------------------------------------------------------------------

import type { ApiRequestHistoryEntry } from "./types";
import type { LabeledTone } from "@/types/ui";

export const CLOSURE_STATUSES =
  "DELIVERED,DELIVERED_WITH_EXCEPTION,DRIVER_SUBMITTED_COMPLETION,MANAGER_REVIEW,REQUIRES_CORRECTION";

// Request History mixes three different kinds of driver ask - label each row
// so it's clear at a glance which one a given decision was for.
export const REQUEST_TYPE_META: Record<
  ApiRequestHistoryEntry["type"],
  LabeledTone
> = {
  JOB_REQUEST: { label: "Job request", bg: "#eff6ff", fg: "#1d4ed8" },
  CANCELLATION: { label: "Cancellation", bg: "#fef2f2", fg: "#b91c1c" },
  CLOSURE: { label: "Closure", bg: "#f0fdf4", fg: "#15803d" },
};

export const tableSx = {
  tableLayout: "fixed",
  width: "100%",
  "& .MuiTableCell-root": {
    px: 2,
    py: 1.5,
    verticalAlign: "middle",
    whiteSpace: "normal",
    overflowWrap: "break-word",
    borderColor: "#e2e8f0",
  },
  "& .MuiTableCell-root:first-of-type": { pl: 2.5 },
  "& .MuiTableCell-root:last-of-type": { pr: 2.5 },
  "& .MuiTableHead-root .MuiTableCell-root": {
    backgroundColor: "#f8fafc",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    py: 1.25,
    borderBottom: "1px solid #e2e8f0",
  },
} as const;
