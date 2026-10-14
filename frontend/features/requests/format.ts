// ---------------------------------------------------------------------------
// Pure helpers for the job-request queue page.
// ---------------------------------------------------------------------------

/** Tailwind classes for a tab count badge, colored only when the count > 0. */
export function tabBadgeClass(count: number, activeClasses: string): string {
  return `flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
    count > 0 ? activeClasses : "bg-slate-100 text-slate-500"
  }`;
}
