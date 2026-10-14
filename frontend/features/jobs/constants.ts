// ---------------------------------------------------------------------------
// Static configuration for the jobs list page: tab set, per-tab card copy,
// form option lists and shared field styling.
// ---------------------------------------------------------------------------

import type { JobStatus } from "./types";

export const tabs: ("ALL" | JobStatus)[] = ["ALL", "PUBLISHED", "ACTIVE", "COMPLETED", "CANCELLED"];

export const cardLabel: Record<string, string> = {
  ALL: "All Jobs",
  PUBLISHED: "Published Jobs",
  ACTIVE: "Active Jobs",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const cardHint: Record<string, { text: string; color: string }> = {
  ALL: { text: "Every status", color: "#64748b" },
  PUBLISHED: { text: "In the pool", color: "#2563eb" },
  ACTIVE: { text: "Ongoing jobs", color: "#16a34a" },
  COMPLETED: { text: "Delivered", color: "#64748b" },
  CANCELLED: { text: "Deactivated", color: "#dc2626" },
};

export const units = ["Pallets", "Boxes", "Tons", "Units", "Containers", "Other"];

export const MAX_DELIVERY_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

// Drivers only get offered a published job if its pickup falls within the
// next 24 hours (see backend jobOffers.offerPublishedJob) - jobs scheduled
// further out won't be sent to anyone until they roll inside that window.
export const DRIVER_DISCOVERY_WINDOW_NOTE =
  "Drivers are only notified once the pickup time is within 24 hours — jobs scheduled further out won't reach anyone until then.";

// Alphabet for locally-generated security codes (excludes look-alike chars).
export const LOCAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const fieldLabelSx = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  mb: 0.5,
  display: "block",
} as const;
