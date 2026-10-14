"use client";

import * as React from "react";
import { fmtDelay, stageDelayMinutes } from "../../detail";

/** How late a stage was, and the driver's reason (or that it is still pending). Nothing when it was on time. */
export function DelayCard({
  label,
  scheduled,
  actual,
  reason,
}: {
  label: string;
  scheduled: string | null;
  actual: string | null;
  reason: string | null;
}) {
  const minutes = stageDelayMinutes(scheduled, actual);
  if (minutes == null) return null;
  return (
    <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px]">
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold text-amber-800">
          {label}: {fmtDelay(minutes)} late
        </span>
        {!reason && (
          <span className="rounded bg-amber-200/70 px-1 font-bold text-[9px] text-amber-900">
            Pending
          </span>
        )}
      </div>
      {reason && (
        <span className="mt-0.5 block text-[10px] text-amber-700 truncate">
          Reason: {reason}
        </span>
      )}
    </div>
  );
}
