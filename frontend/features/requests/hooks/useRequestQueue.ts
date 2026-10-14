"use client";

import * as React from "react";
import { describeError } from "@/shared/api/describeError";
import { usePolling } from "@/shared/hooks/usePolling";
import { cancellationDecision, completeJob, fetchJobs } from "@/features/jobs/api";
import type { ApiJobSummary } from "@/features/jobs/types";
import { approveJobRequest, fetchJobRequests, fetchRequestHistory, rejectJobRequest } from "../api";
import { CLOSURE_STATUSES } from "../constants";
import type { ApiJobRequest, ApiRequestHistoryEntry } from "../types";
import { feedback } from "@/shared/feedback/store";

const REFRESH_MS = 5_000;

/** What waits for a manager: job requests, cancellation requests and delivered jobs to close, with the history of decisions. Refreshed every 5 seconds. */
export function useRequestQueue() {
  const [requests, setRequests] = React.useState<ApiJobRequest[] | null>(null);
  const [requestHistory, setRequestHistory] = React.useState<ApiRequestHistoryEntry[] | null>(null);
  const [closureJobs, setClosureJobs] = React.useState<ApiJobSummary[] | null>(null);
  const [cancelJobs, setCancelJobs] = React.useState<ApiJobSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [closureBusyId, setClosureBusyId] = React.useState<string | null>(null);
  const [cancelBusyId, setCancelBusyId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal: AbortSignal) => {
    try {
      const [requestData, historyData, closureData, cancelData] = await Promise.all([
        fetchJobRequests("REQUESTED"),
        fetchRequestHistory(),
        fetchJobs({ status: CLOSURE_STATUSES }),
        fetchJobs({ status: "CANCELLATION_REVIEW" }),
      ]);
      if (signal.aborted) return;
      setRequests(requestData);
      setRequestHistory(historyData);
      setClosureJobs(closureData);
      setCancelJobs(cancelData);
      setError(null);
    } catch (err) {
      if (!signal.aborted) setError(describeError(err, "Failed to load requests"));
    }
  }, []);

  const { refresh } = usePolling(load, REFRESH_MS);

  /** Run one decision with its own busy marker; a refusal is shown above the tabs. */
  async function decideWith(setBusy: (id: string | null) => void, id: string, work: () => Promise<unknown>, afterwards: () => void | Promise<void>, failure: string, success: string) {
    setBusy(id);
    setActionError(null);
    try {
      await work();
      feedback.success(success);
      await afterwards();
    } catch (err) {
      const message = describeError(err, failure);
      setActionError(message); feedback.error(message);
    } finally {
      setBusy(null);
    }
  }

  const decide = (request: ApiJobRequest, decision: "APPROVED" | "REJECTED") => decideWith(
    setBusyId, request.id,
    () => (decision === "APPROVED" ? approveJobRequest(request.id) : rejectJobRequest(request.id)),
    async () => {
      setRequests((prev) => prev?.filter((r) => r.id !== request.id) ?? null);
      await refresh();
    },
    `Failed to ${decision.toLowerCase()} request`,
    decision === "APPROVED" ? "Job request approved." : "Job request rejected.",
  );

  const decideCancellation = (job: ApiJobSummary, action: "release" | "reject") => decideWith(
    setCancelBusyId, job.id, () => cancellationDecision(job.id, action),
    () => setCancelJobs((prev) => prev?.filter((j) => j.id !== job.id) ?? null), "Cancellation decision failed",
    action === "release" ? "Cancellation accepted and driver released." : "Cancellation request rejected.",
  );

  const closeJob = (job: ApiJobSummary) => decideWith(
    setClosureBusyId, job.id, () => completeJob(job.id),
    () => setClosureJobs((prev) => prev?.filter((j) => j.id !== job.id) ?? null), "Closure action failed",
    `${job.jobNumber} was closed.`,
  );

  return { requests, requestHistory, closureJobs, cancelJobs, error, actionError, busyId, closureBusyId, cancelBusyId, decide, decideCancellation, closeJob };
}
