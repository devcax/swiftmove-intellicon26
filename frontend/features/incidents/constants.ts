// ---------------------------------------------------------------------------
// Static incident configuration: severity/status tone lookups and the list of
// status filters shown as chips on the incidents page.
// ---------------------------------------------------------------------------

import type { LabeledOption, ToneColor } from "@/types/ui";

export const SEVERITY_TONE: Record<string, ToneColor> = {
  CRITICAL: { bg: "#fee2e2", fg: "#b91c1c" },
  HIGH: { bg: "#ffedd5", fg: "#c2410c" },
  MEDIUM: { bg: "#fef3c7", fg: "#b45309" },
  LOW: { bg: "#e2e8f0", fg: "#475569" },
};

export const STATUS_TONE: Record<string, ToneColor> = {
  OPEN: { bg: "#fee2e2", fg: "#b91c1c" },
  UNDER_REVIEW: { bg: "#fef3c7", fg: "#b45309" },
  RESOLVED: { bg: "#dcfce7", fg: "#15803d" },
};

export const FILTERS: LabeledOption[] = [
  { key: "", label: "All" },
  { key: "OPEN,UNDER_REVIEW", label: "Active" },
  { key: "OPEN", label: "Open" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "RESOLVED", label: "Resolved" },
];
