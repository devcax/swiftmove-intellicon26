"use client";

import * as React from "react";
import { describeError } from "@/shared/api/describeError";
import { usePolling } from "@/shared/hooks/usePolling";
import { fetchLiveJobs } from "../api";
import type { ApiLiveJob } from "../types";

const REFRESH_MS = 5_000;

/** The trips on the road: loaded now and every 5 seconds while the tab is visible. */
export function useLiveJobs() {
  const [jobs, setJobs] = React.useState<ApiLiveJob[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal: AbortSignal) => {
    try {
      const data = await fetchLiveJobs();
      if (signal.aborted) return;
      setJobs(data);
      setError(null);
    } catch (err) {
      if (!signal.aborted) setError(describeError(err, "Failed to load live jobs"));
    }
  }, []);

  usePolling(load, REFRESH_MS);
  return { jobs, error };
}
