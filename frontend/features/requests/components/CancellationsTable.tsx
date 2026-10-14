"use client";
import Button from "@mui/material/Button";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { ApiJobSummary } from "@/features/jobs/types";
import { QueueTable } from "./QueueTable";
import { QueueJobCell } from "./QueueCells";

export function CancellationsTable({ cancelJobs, error, busyId, onAct }: { cancelJobs: ApiJobSummary[] | null; error: string | null; busyId: string | null; onAct: (job: ApiJobSummary, action: "release" | "reject") => void }) {
  return <QueueTable rows={cancelJobs} error={error} label="Cancellations" emptyMessage="No cancellation requests" columns={[
    { key: "job", label: "Job / Route", render: row => <QueueJobCell job={row} /> },
    { key: "driver", label: "Driver", render: row => row.driver ?? "—" },
    { key: "reason", label: "Reason", render: row => row.cancellationReason ?? "Not given" },
  ]} renderActions={row => <div className="flex justify-end gap-2">
    <Button size="small" variant="outlined" color="warning" startIcon={<CloseRoundedIcon />} disabled={busyId === row.id} onClick={() => onAct(row, "reject")}>Reject request</Button>
    <Button size="small" variant="contained" color="success" startIcon={<CheckRoundedIcon />} disabled={busyId === row.id} onClick={() => onAct(row, "release")}>{busyId === row.id ? "Saving…" : "Accept & release driver"}</Button>
  </div>} />;
}
