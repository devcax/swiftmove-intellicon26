"use client";

import * as React from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import StatusChip from "@/components/StatusChip";
import type { ApiJobDetail } from "../../types";

const FINAL_STATUSES = ["COMPLETED", "CANCELLED"];

interface JobHeaderProps {
  job: ApiJobDetail;
  displayStatus: string;
  busy: boolean;
  hasLiveAssignment: boolean;
  onBack: () => void;
  onRelease: () => void;
  onReset: () => void;
  onCancel: () => void;
}

/** The job number and status, and the buttons that release the driver, reset or cancel the job. */
export function JobHeader({ job, displayStatus, busy, hasLiveAssignment, onBack, onRelease, onReset, onCancel }: JobHeaderProps) {
  const inCancellationReview = job.status === "CANCELLATION_REVIEW";
  const finalStatuses = FINAL_STATUSES;
  return (
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => onBack()}
            startIcon={<ArrowBackRoundedIcon />}
            size="small"
            variant="outlined"
            sx={{ bgcolor: "#fff" }}
          >
            Jobs
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {job.jobNumber}
          </Typography>
          <StatusChip status={displayStatus} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            color="warning"
            variant="outlined"
            size="small"
            startIcon={<PersonRemoveRoundedIcon />}
            disabled={busy || !hasLiveAssignment}
            onClick={() => onRelease()}
          >
            Release Driver
          </Button>
          {job.status !== "COMPLETED" && (
            <Button
              color="error"
              variant="outlined"
              size="small"
              startIcon={<RestartAltRoundedIcon />}
              disabled={busy || job.status === "DRAFT"}
              onClick={() => onReset()}
            >
              Reset Job
            </Button>
          )}
          {!finalStatuses.includes(job.status) && !inCancellationReview && (
            <Button
              color="error"
              variant="outlined"
              size="small"
              startIcon={<CancelOutlinedIcon />}
              disabled={busy}
              onClick={() => onCancel()}
            >
              Cancel Job
            </Button>
          )}
        </div>
      </div>
  );
}
