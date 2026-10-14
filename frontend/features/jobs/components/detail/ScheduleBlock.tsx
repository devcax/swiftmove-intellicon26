"use client";

import * as React from "react";
import type { ApiJobDetail } from "../../types";
import Typography from "@mui/material/Typography";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { fmtTime } from "../../detail";
import { DelayCard } from "./DelayCard";

export function ScheduleBlock({ job }: { job: ApiJobDetail }) {
  
  return (
    <div className="flex flex-col justify-between py-2 lg:col-span-2 lg:px-4 lg:py-0">
      <div className="flex items-center gap-2">
        <ScheduleRoundedIcon sx={{ color: "#2563eb", fontSize: 18 }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#64748b",
          }}
        >
          Schedule
        </Typography>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            Pick:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {fmtTime(job.pickupAt)}
          </Typography>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            Drop:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {fmtTime(job.deliveryAt)}
          </Typography>
        </div>
        <DelayCard
          label="Pickup"
          scheduled={job.pickupAt}
          actual={job.pickupActualAt}
          reason={job.pickupDelayReason}
        />
        <DelayCard
          label="Delivery"
          scheduled={job.deliveryAt}
          actual={job.deliveryActualAt}
          reason={job.deliveryDelayReason}
        />
      </div>
    </div>
  );
}
