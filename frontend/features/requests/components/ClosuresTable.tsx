"use client";
import Link from "next/link";
import Button from "@mui/material/Button";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import StatusChip from "@/components/StatusChip";
import type { ApiJobSummary } from "@/features/jobs/types";
import { QueueTable } from "./QueueTable";
import { QueueJobCell } from "./QueueCells";

export function ClosuresTable({ closureJobs, error, busyId, onClose }: { closureJobs: ApiJobSummary[] | null; error: string | null; busyId: string | null; onClose: (job: ApiJobSummary) => void }) {
  return <QueueTable rows={closureJobs} error={error} label="Closures" emptyMessage="No trips awaiting closure" columns={[
    { key: "job", label: "Job / Route", render: row => <QueueJobCell job={row} /> },
    { key: "driver", label: "Driver", render: row => row.driver ?? "—" },
    { key: "cargo", label: "Cargo", render: row => row.quantity ?? row.cargo },
    { key: "status", label: "Status", render: row => <StatusChip status={row.status} /> },
  ]} renderActions={row => <div className="flex justify-end gap-2">
    <Button size="small" variant="contained" color="success" startIcon={<CheckRoundedIcon />} disabled={busyId === row.id} onClick={() => onClose(row)}>{busyId === row.id ? "Saving…" : "Approve & close"}</Button>
    <Button component={Link} href={`/jobs/${row.id}`} size="small" variant="outlined">View</Button>
  </div>} />;
}
