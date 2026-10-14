// ---------------------------------------------------------------------------
// Pure, framework-free display helpers shared across the dashboard: name
// initials and relative/absolute time formatting. No React, no side effects.
// ---------------------------------------------------------------------------

/** Up-to-two-letter initials from a display name (e.g. "Nuwan Perera" -> "NP"). */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Relative "how long ago" label for an ISO timestamp. When the timestamp is
 * missing, `nullLabel` is returned so each caller can pick its own wording.
 */
export function timeAgo(iso: string | null, nullLabel = "just now"): string {
  if (!iso) return nullLabel;
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** Date + time for display (e.g. "Sep 3, 09:41"), or `emptyLabel` when absent. */
export function fmtDateTime(iso: string | null, emptyLabel = "—"): string {
  if (!iso) return emptyLabel;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Time-of-day only (e.g. "09:41"), or `emptyLabel` when absent. */
export function fmtClock(
  iso: string | null | undefined,
  emptyLabel = "",
): string {
  if (!iso) return emptyLabel;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Turn a SCREAMING_SNAKE value into a capitalized sentence ("Incident Open" -> "Incident open"). */
export function humanize(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
