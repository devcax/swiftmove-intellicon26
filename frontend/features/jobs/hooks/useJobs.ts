"use client";

import * as React from "react";
import { describeError } from "@/shared/api/describeError";
import { usePolling } from "@/shared/hooks/usePolling";
import { activateJob, deactivateJob, deleteJob, fetchJobs } from "../api";
import { mapJob } from "../listing";
import type { ApiJobSummary, Job, JobStatus } from "../types";

const REFRESH_MS = 5_000;

export type RowActionName = "activate" | "deactivate" | "delete";
export type Notify = (severity: "success" | "error", message: string) => void;

/** The jobs list: loaded now and every 5 seconds while the tab is visible, with the row actions (reactivate, deactivate, delete). */
export function useJobs(notify: Notify) {
  const [jobList, setJobList] = React.useState<Job[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [rowAction, setRowAction] = React.useState<{ id: string; action: RowActionName } | null>(null);

  const load = React.useCallback(async (signal: AbortSignal) => {
    try {
      const data = await fetchJobs();
      if (signal.aborted) return;
      setJobList(data.map(mapJob));
      setLoadError(null);
    } catch (err) {
      if (signal.aborted) return;
      // Keep what is on screen when a refresh fails.
      setJobList((current) => current ?? []);
      setLoadError(describeError(err, "Could not load jobs."));
    }
  }, []);

  const { refresh } = usePolling(load, REFRESH_MS);

  const isBusy = (id: string | undefined) => rowAction !== null && rowAction.id === id;
  const isPending = (id: string | undefined, action: RowActionName) => rowAction !== null && rowAction.id === id && rowAction.action === action;

  const addJob = (created: ApiJobSummary) => setJobList((current) => [mapJob(created), ...(current ?? [])]);
  const replaceJob = (updated: ApiJobSummary) => setJobList((current) => (current ?? []).map((job) => (job.id === updated.id ? mapJob(updated) : job)));

  /** One row action: block double clicks, show the result in the row at once, and say what happened. */
  async function act(job: Job, action: RowActionName, work: () => Promise<unknown>, apply: (jobs: Job[]) => Job[], success: string, failure: string): Promise<boolean> {
    if (!job.id || rowAction) return false;
    setRowAction({ id: job.id, action });
    try {
      await work();
      setJobList((current) => apply(current ?? []));
      notify("success", success);
      return true;
    } catch (err) {
      notify("error", describeError(err, failure));
      return false;
    } finally {
      setRowAction(null);
    }
  }

  const setStatus = (id: string | undefined, status: JobStatus) => (jobs: Job[]) => jobs.map((job) => (job.id === id ? { ...job, status } : job));

  const deactivate = (job: Job) => act(job, "deactivate", () => deactivateJob(job.id as string), setStatus(job.id, "CANCELLED"), `${job.jobNumber} deactivated`, "Could not deactivate the job. Please try again.");
  const activate = (job: Job) => act(job, "activate", () => activateJob(job.id as string), setStatus(job.id, "PUBLISHED"), `${job.jobNumber} reactivated and published to the driver pool`, "Could not reactivate the job. Please try again.");
  const remove = (job: Job) => act(job, "delete", () => deleteJob(job.id as string), (jobs) => jobs.filter((j) => j.id !== job.id), `${job.jobNumber} deleted`, "Could not delete the job. Please try again.");

  return { jobList, loadError, reload: refresh, addJob, replaceJob, isBusy, isPending, activate, deactivate, remove };
}
