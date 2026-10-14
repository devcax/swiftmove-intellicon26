"use client";

import * as React from "react";
import { fetchOperationsOverview } from "@/features/overview/api";
import type { ApiOperationsOverview } from "@/features/overview/types";

const REFRESH_MS = 15_000;

/** The live operations overview, refreshed every 15 seconds. */
export function useOverview() {
  const [data, setData] = React.useState<ApiOperationsOverview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<Record<string, number[]>>({});

  const load = React.useCallback(async () => {
    try {
      const result = await fetchOperationsOverview();
      setData(result);
      setHistory((previous) => Object.fromEntries(result.kpis.map((kpi) => [
        kpi.label, [...(previous[kpi.label] ?? []), kpi.value].slice(-24),
      ])));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the operations overview.");
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await load();
    })();
    const interval = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { data, error, reload: load, history };
}
