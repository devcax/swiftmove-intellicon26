"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import StatusChip from "@/components/StatusChip";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import type { ApiOverviewJob } from "@/features/overview/types";
import { OverviewPanel } from "./OverviewPanel";

const columns: DataTableColumn<ApiOverviewJob>[] = [
  { key: "number", label: "No", width: 50, render: (_, index) => index + 1 },
  { key: "job", label: "Job", render: (job) => <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{job.jobNumber}</Typography> },
  { key: "driver", label: "Driver", render: (job) => job.driver },
  { key: "route", label: "Route", width: "24%", render: (job) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
      <span>{job.origin}</span><ArrowForwardRoundedIcon sx={{ fontSize: 14, color: "#64748b" }} /><span>{job.destination}</span>
    </Box>
  ) },
  { key: "status", label: "Status", render: (job) => <StatusChip status={job.status} /> },
  { key: "updated", label: "Last update", render: (job) => (
    <Box><Typography sx={{ fontSize: 12.5 }}>{job.lastUpdate}</Typography><Typography sx={{ fontSize: 11, color: "#64748b", mt: 0.5 }}>{job.lastUpdateAgo}</Typography></Box>
  ) },
  { key: "exception", label: "Exception", render: (job) => job.exception ? (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, color: job.status.includes("INCIDENT") ? "#b91c1c" : "#92400e" }}>
      <WarningAmberRoundedIcon sx={{ fontSize: 16, flexShrink: 0 }} /><span>{job.exception}</span>
    </Box>
  ) : "—" },
];

/** Dashboard deliveries use the shared table, with fixed-height scrolling and pagination. */
export function ActiveJobsBoard({ jobs }: { jobs: ApiOverviewJob[] }) {
  return (
    <OverviewPanel title="Active deliveries" subtitle={`Latest ${jobs.length} active jobs`} href="/jobs" height={400}>
      <DataTable columns={columns} rows={jobs} getRowKey={(job) => job.jobNumber} label="Active deliveries"
        emptyMessage="No jobs are on the road right now." minWidth={900} />
    </OverviewPanel>
  );
}
