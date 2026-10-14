"use client";

import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { TableActionButton } from "@/shared/components/TableActionButton";
import { CopyableText } from "@/shared/components/CopyableText";
import StatusChip from "@/components/StatusChip";
import { latestStatus } from "../listing";
import type { RowActionName } from "../hooks/useJobs";
import type { Job } from "../types";

const columns: DataTableColumn<Job>[] = [
  { key: "number", label: "No", width: 50, render: (_, index) => index + 1 },
  { key: "job", label: "Job", render: (job) => job.id ? <Typography component={Link} href={`/jobs/${job.id}`} sx={{ fontSize: 13, fontWeight: 600, color: "#1e3a8a", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{job.jobNumber}</Typography> : job.jobNumber },
  { key: "status", label: "Status", render: (job) => <StatusChip status={latestStatus(job)} /> },
  { key: "driver", label: "Driver", render: (job) => job.driver ?? "Unassigned" },
  { key: "route", label: "Route", render: (job) => <Box sx={{ display: "flex", alignItems: "center", whiteSpace: "nowrap", gap: 0.5 }}><span>{job.origin}</span><ArrowForwardRoundedIcon sx={{ fontSize: 14, flexShrink: 0 }} /><span>{job.destination}</span></Box> },
  { key: "cargo", label: "Cargo", render: (job) => <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><Typography sx={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{job.cargo}</Typography><Typography sx={{ fontSize: 11, color: "#64748b" }}>· {job.quantity}</Typography></Box> },
  { key: "window", label: "Schedule", render: (job) => job.window },
  { key: "pickupCode", label: "Pickup code", render: (job) => <CopyableText key={job.pickupCode} value={job.pickupCode} label="Pickup code" /> },
  { key: "deliveryCode", label: "Delivery code", render: (job) => <CopyableText key={job.deliveryCode} value={job.deliveryCode} label="Delivery code" /> },
];

interface JobsTableProps {
  jobs: Job[] | null; loadError: string | null; onRetry: () => void;
  isBusy: (id: string | undefined) => boolean; isPending: (id: string | undefined, action: RowActionName) => boolean;
  onEdit: (job: Job) => void; onToggle: (job: Job) => void; onDelete: (job: Job) => void;
}

export function JobsTable({ jobs, loadError, onRetry, isBusy, isPending, onEdit, onToggle, onDelete }: JobsTableProps) {
  return <>
    {loadError && <Alert severity="warning" sx={{ m: 2 }} action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>{loadError}</Alert>}
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: { xs: 1.5, sm: 3 } }}>
      <DataTable columns={columns} rows={jobs ?? []} getRowKey={(job) => job.id ?? job.jobNumber} label="Jobs" scrollMode="page" compact singleLine pinActions pageSize={10} minWidth={1100} loading={jobs === null && !loadError} emptyMessage="No jobs match this view"
        renderActions={(job) => <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.75 }}>
          <TableActionButton label={["DRAFT", "PUBLISHED"].includes(job.status) ? `Edit ${job.jobNumber}` : "Only draft or published jobs can be edited"} icon={<EditOutlinedIcon />} disabled={!job.id || isBusy(job.id) || !["DRAFT", "PUBLISHED"].includes(job.status)} onClick={() => onEdit(job)} />
          <TableActionButton label={job.status === "COMPLETED" ? "Job already completed" : job.status === "CANCELLED" ? "Reactivate job" : "Deactivate job"} tone={job.status === "CANCELLED" ? "success" : "neutral"}
            icon={isPending(job.id, "activate") || isPending(job.id, "deactivate") ? <CircularProgress size={16} color="inherit" /> : <PowerSettingsNewRoundedIcon />} disabled={!job.id || isBusy(job.id) || job.status === "COMPLETED"} onClick={() => onToggle(job)} />
          <TableActionButton label={`Delete ${job.jobNumber}`} tone="danger" icon={isPending(job.id, "delete") ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineRoundedIcon />} disabled={!job.id || isBusy(job.id)} onClick={() => onDelete(job)} />
        </Box>} />
    </Box>
  </>;
}
