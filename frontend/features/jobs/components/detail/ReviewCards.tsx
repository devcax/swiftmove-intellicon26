"use client";

import * as React from "react";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import { cancellationDecision, completeJob } from "../../api";
import type { ApiJobDetail } from "../../types";

interface ReviewCardsProps {
  job: ApiJobDetail;
  busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>;
  onRequestCorrection: () => void;
}

/** What the manager has to decide: a driver's cancellation request, closing a delivered job, or reviewing a closure the driver asked for. */
export function ReviewCards({ job, busy, run, onRequestCorrection }: ReviewCardsProps) {
  const inCancellationReview = job.status === "CANCELLATION_REVIEW";
  const inCompletionReview = ["DRIVER_SUBMITTED_COMPLETION", "MANAGER_REVIEW", "REQUIRES_CORRECTION"].includes(job.status);
  const readyForClosure = ["DELIVERED", "DELIVERED_WITH_EXCEPTION"].includes(job.status);
  return (
    <>
      {inCancellationReview && (
        <Paper
          className="shrink-0"
          sx={{
            p: 2.5,
            border: "1px solid #fde68a",
            bgcolor: "#fffbeb",
            borderRadius: 3,
          }}
        >
          <div className="flex items-start gap-2.5">
            <ReportProblemRoundedIcon sx={{ color: "#d97706", mt: 0.3 }} />
            <div className="flex-1">
              <Typography sx={{ fontWeight: 800, color: "#92400e" }}>
                {job.assignment?.driver.name ?? "The driver"} asked to cancel
                this job
              </Typography>
              <Typography variant="body2" sx={{ color: "#a16207", mt: 0.5 }}>
                Reason: {job.assignment?.cancellationReason ?? "not given"}
              </Typography>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() =>
                    run(() => cancellationDecision(job.id, "release"))
                  }
                >
                  Release driver (job reopens)
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  disabled={busy}
                  onClick={() =>
                    run(() => cancellationDecision(job.id, "reject"))
                  }
                >
                  Reject request (keep job)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={busy}
                  onClick={() =>
                    run(() => cancellationDecision(job.id, "cancel"))
                  }
                >
                  Cancel the job
                </Button>
              </div>
            </div>
          </div>
        </Paper>
      )}

      {/* Closure Card */}
      {readyForClosure && (
        <Paper
          className="shrink-0"
          sx={{
            p: 2.5,
            border: "1px solid #bbf7d0",
            bgcolor: "#f0fdf4",
            borderRadius: 3,
          }}
        >
          <div className="flex items-start gap-2.5">
            <CheckCircleOutlineRoundedIcon sx={{ color: "#16a34a", mt: 0.3 }} />
            <div className="flex-1">
              <Typography sx={{ fontWeight: 800, color: "#166534" }}>
                This trip has been delivered
                {job.status === "DELIVERED_WITH_EXCEPTION"
                  ? " with an exception"
                  : ""}
              </Typography>
              <Typography variant="body2" sx={{ color: "#15803d", mt: 0.5 }}>
                Close the job to mark it completed and release the driver for
                their next job.
              </Typography>
              <div className="mt-3">
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() => run(() => completeJob(job.id))}
                >
                  Approve & Close Job
                </Button>
              </div>
            </div>
          </div>
        </Paper>
      )}

      {/* Completion Review Card */}
      {inCompletionReview && (
        <Paper
          className="shrink-0"
          sx={{
            p: 2.5,
            border: "1px solid #bfdbfe",
            bgcolor: "#eff6ff",
            borderRadius: 3,
          }}
        >
          <div className="flex items-start gap-2.5">
            <CheckCircleOutlineRoundedIcon sx={{ color: "#2563eb", mt: 0.3 }} />
            <div className="flex-1">
              <Typography sx={{ fontWeight: 800, color: "#1e40af" }}>
                {job.status === "REQUIRES_CORRECTION"
                  ? "Correction requested from the driver"
                  : job.status === "MANAGER_REVIEW"
                    ? "This trip is in closure review"
                    : "The driver requested closure of this trip"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#3b82f6", mt: 0.5 }}>
                Review the timeline below, then approve the close or ask for a
                correction.
              </Typography>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() => run(() => completeJob(job.id))}
                >
                  Approve & Close Job
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  startIcon={<EditNoteRoundedIcon />}
                  onClick={() => onRequestCorrection()}
                >
                  Request Correction
                </Button>
              </div>
            </div>
          </div>
        </Paper>
      )}
    </>
  );
}
