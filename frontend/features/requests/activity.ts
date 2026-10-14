import type { ApiRequestHistoryEntry } from "./types";

export type ActivityPeriod = "week" | "month" | "year";
export function reviewActivity(history: ApiRequestHistoryEntry[], period: ActivityPeriod, now = new Date()) {
  const length = period === "week" ? 7 : period === "month" ? 30 : 12;
  const buckets = Array.from({ length }, (_, index) => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (period === "year") { start.setDate(1); start.setMonth(start.getMonth() - (length - 1 - index)); }
    else start.setDate(start.getDate() - (length - 1 - index));
    const end = new Date(start);
    if (period === "year") end.setMonth(end.getMonth() + 1);
    else end.setDate(end.getDate() + 1);
    return { start, end, label: start.toLocaleDateString(undefined, period === "year" ? { month: "short" } : { month: "short", day: "numeric" }), value: 0 };
  });
  for (const entry of history) {
    const date = new Date(entry.decidedAt);
    const bucket = buckets.find(item => date >= item.start && date < item.end);
    if (bucket) bucket.value++;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}
