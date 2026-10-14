"use client";

import * as React from "react";
import { describeError } from "@/shared/api/describeError";
import { usePolling } from "@/shared/hooks/usePolling";
import { fetchJob, fetchJobActivity, fetchJobTimeline } from "../api";
import type { ApiJobActivityMessage, ApiJobDetail, ApiTimelineEvent } from "../types";
import { feedback } from "@/shared/feedback/store";

const REFRESH_MS = 5_000;

/** One job with its timeline and WhatsApp activity: loaded now and every 5 seconds, and an  that does a manager action and reloads. */
export function useJobDetail(jobId: string) {
  const [job, setJob] = React.useState<ApiJobDetail | null>(null);
  const [timeline, setTimeline] = React.useState<ApiTimelineEvent[]>([]);
  const [activity, setActivity] = React.useState<ApiJobActivityMessage[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal: AbortSignal) => {
    try {
      const [detail, events, activityData] = await Promise.all([fetchJob(jobId), fetchJobTimeline(jobId), fetchJobActivity(jobId)]);
      if (signal.aborted) return;
      setJob(detail);
      setTimeline(events);
      setActivity(activityData.messages);
      setError(null);
    } catch (err) {
      if (!signal.aborted) setError(describeError(err, "Failed to load job"));
    }
  }, [jobId]);

  const { refresh } = usePolling(load, REFRESH_MS);

  /** Do a manager action, then show the job as it is now. A refusal is shown above the cards. */
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await work();
      feedback.success("Job updated successfully.");
      await refresh();
    } catch (err) {
      const message = describeError(err, "Action failed");
      setActionError(message); feedback.error(message);
    } finally {
      setBusy(false);
    }
  };

  return { job, timeline, activity, error, busy, actionError, run };
}
