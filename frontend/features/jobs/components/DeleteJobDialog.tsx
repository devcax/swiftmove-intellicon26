"use client";
import { FeedbackDialog } from "@/shared/components/FeedbackDialog";
import type { Job } from "../types";

export function DeleteJobDialog({ job, pending, onClose, onConfirm }: { job: Job | null; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return <FeedbackDialog open={job !== null} title="Delete this job?" message={job ? `Permanently delete ${job.jobNumber} (${job.origin} → ${job.destination})? All requests, assignments and workflow history for this job will be removed.` : ""} severity="error" confirmation confirmLabel="Delete job" pending={pending} onClose={onClose} onConfirm={onConfirm} />;
}
