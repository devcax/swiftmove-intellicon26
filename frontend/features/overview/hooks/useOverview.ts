"use client";

import * as React from "react";
import { fetchOperationsOverview } from "@/features/overview/api";
import type { ApiOperationsOverview } from "@/features/overview/types";
import { usePolling } from "@/shared/hooks/usePolling";

const REFRESH_MS = 15_000;

/** The live operations overview, refreshed every 15 seconds. */
export function useOverview() {
  const [data, setData] = React.useState<ApiOperationsOverview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<Record<string, number[]>>({});

  const load = React.useCallback(async (signal: AbortSignal) => {
    try {
      const result = await fetchOperationsOverview(signal);
      if (signal.aborted) return;
      setData(result);
      setHistory((previous) => Object.fromEntries(result.kpis.map((kpi) => [
        kpi.label, [...(previous[kpi.label] ?? []), kpi.value].slice(-24),
      ])));
      setError(null);
    } catch (err) {
      if (!signal.aborted) setError(err instanceof Error ? err.message : "Could not load the operations overview.");
    }
  }, []);

  const { refresh } = usePolling(load, REFRESH_MS);

  return { data, error, reload: refresh, history };
}
