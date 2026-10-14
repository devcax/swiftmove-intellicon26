"use client";
import { useState } from "react";
import { FeedbackDialog } from "@/shared/components/FeedbackDialog";
import { FormTextField } from "@/shared/components/FormTextField";
import { cancelJob, releaseDriver, requestJobCorrection, resetJob } from "../../api";
import type { ApiJobDetail } from "../../types";

export type JobDialog = "cancel" | "correction" | "release" | "reset";
export function JobActionDialogs({ job, open, busy, run, onClose }: {
  job: ApiJobDetail; open: JobDialog | null; busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>; onClose: () => void;
}) {
  const [cancelReason, setCancelReason] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [releaseReason, setReleaseReason] = useState("");
  const config = {
    cancel: { title: `Cancel ${job.jobNumber}?`, message: "The job is cancelled immediately and the assigned driver is notified over WhatsApp.", label: "Cancel job", severity: "error" as const, work: () => cancelJob(job.id, cancelReason || undefined) },
    correction: { title: "Request a correction", message: "The driver receives a WhatsApp message explaining what needs to be corrected.", label: "Send request", severity: "info" as const, work: () => requestJobCorrection(job.id, correctionNote || undefined) },
    release: { title: "Release this driver?", message: "The driver is notified and the job reopens for another driver.", label: "Release driver", severity: "warning" as const, work: () => releaseDriver(job.id, releaseReason || undefined) },
    reset: { title: `Reset ${job.jobNumber}?`, message: "This removes the driver assignment, requests, incidents, workflow events, and job notifications. The job returns to Published with new security codes.", label: "Reset job", severity: "error" as const, work: () => resetJob(job.id) },
  };
  const selected = open ? config[open] : null;
  return <FeedbackDialog open={open !== null} title={selected?.title ?? "Confirm action"} message={selected?.message} severity={selected?.severity} confirmation confirmLabel={selected?.label} pending={busy} onClose={onClose} onConfirm={() => { if (selected && !busy) void run(selected.work).then(onClose); }}>
    {open === "cancel" && <FormTextField label="Reason (optional)" value={cancelReason} disabled={busy} onChange={event => setCancelReason(event.target.value)} />}
    {open === "correction" && <FormTextField label="What needs correcting?" value={correctionNote} disabled={busy} onChange={event => setCorrectionNote(event.target.value)} />}
    {open === "release" && <FormTextField label="Reason (optional)" value={releaseReason} disabled={busy} onChange={event => setReleaseReason(event.target.value)} />}
  </FeedbackDialog>;
}
