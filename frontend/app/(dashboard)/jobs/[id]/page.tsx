"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { DriverActivity } from "@/features/jobs/components/detail/DriverActivity";
import { EventTimeline } from "@/features/jobs/components/detail/EventTimeline";
import { JobActionDialogs, type JobDialog } from "@/features/jobs/components/detail/JobActionDialogs";
import { JobHeader } from "@/features/jobs/components/detail/JobHeader";
import { JobProgress } from "@/features/jobs/components/detail/JobProgress";
import { JobSummaryRow } from "@/features/jobs/components/detail/JobSummaryRow";
import { ReviewCards } from "@/features/jobs/components/detail/ReviewCards";
import { latestStatus, progressRank } from "@/features/jobs/detail";
import { useJobDetail } from "@/features/jobs/hooks/useJobDetail";
import { LIVE_JOB_STATUSES } from "@/features/jobs/workflow";
import { pendingProofProgress } from '@/features/jobs/proofProgress';

const LIVE_ASSIGNMENT = ["PENDING_DRIVER_ACCEPTANCE", "ASSIGNED", "ACTIVE", "CANCELLATION_REVIEW"];

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { job, timeline, activity, error, busy, actionError, run } = useJobDetail(params.id);
  const [dialog, setDialog] = React.useState<JobDialog | null>(null);

  if (error && !job) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <Button component={Link} href="/jobs" variant="outlined" startIcon={<ArrowBackRoundedIcon />} size="small">Jobs</Button>
        <Paper sx={{ mt: 3, p: 6, textAlign: "center" }} role="alert">
          <Typography sx={{ color: "#b91c1c", fontWeight: 700 }}>{error}</Typography>
        </Paper>
      </div>
    );
  }
  if (!job) {
    return (
      <div className="flex justify-center p-16">
        <CircularProgress aria-label="Loading the job" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1500px] flex-col gap-4 p-4 sm:p-6">
      <JobHeader
        job={job}
        displayStatus={latestStatus(job.status, job.assignment?.status)}
        busy={busy}
        hasLiveAssignment={LIVE_ASSIGNMENT.includes(job.assignment?.status ?? "")}
        onBack={() => router.back()}
        onRelease={() => setDialog("release")}
        onReset={() => setDialog("reset")}
        onCancel={() => setDialog("cancel")}
      />
      <JobProgress ladderIndex={progressRank(job, timeline)} awaitingDriverConfirmation={job.status === "MANAGER_APPROVED"} pendingProof={pendingProofProgress(job, timeline, progressRank(job, timeline))} />

      {actionError && (
        <Paper className="shrink-0" sx={{ p: 1.5, bgcolor: "#fef2f2", border: "1px solid #fecaca" }} role="alert">
          <Typography variant="body2" sx={{ color: "#b91c1c", fontWeight: 600 }}>{actionError}</Typography>
        </Paper>
      )}

      <ReviewCards job={job} busy={busy} run={run} onRequestCorrection={() => setDialog("correction")} />

      <div className="flex min-w-0 flex-col gap-4">
        <JobSummaryRow job={job} busy={busy} run={run} />
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <EventTimeline timeline={timeline} />
          <DriverActivity activity={activity} isLive={LIVE_JOB_STATUSES.has(job.status)} />
        </div>
      </div>

      <JobActionDialogs job={job} open={dialog} busy={busy} run={run} onClose={() => setDialog(null)} />
    </div>
  );
}
