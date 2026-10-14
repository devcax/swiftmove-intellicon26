"use client";
import Button from "@mui/material/Button";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { timeAgo } from "@/lib/format";
import type { ApiJobRequest } from "../types";
import { QueueTable } from "./QueueTable";
import { QueueJobCell, QueueDriverCell } from "./QueueCells";

export function RequestsTable({ requests, error, busyId, onDecide }: { requests: ApiJobRequest[] | null; error: string | null; busyId: string | null; onDecide: (request: ApiJobRequest, decision: "APPROVED" | "REJECTED") => void }) {
  return <QueueTable rows={requests} error={error} label="Job requests" emptyMessage="No pending requests" columns={[
    { key: "job", label: "Job / Route", render: row => <QueueJobCell job={row.job} /> },
    { key: "driver", label: "Driver", render: row => <QueueDriverCell driver={row.driver} /> },
    { key: "cargo", label: "Cargo", render: row => row.job.quantity ?? row.job.cargo },
    { key: "pickup", label: "Pickup", render: row => new Date(row.job.pickupAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) },
    { key: "requested", label: "Requested", render: row => timeAgo(row.requestedAt) },
  ]} renderActions={row => <div className="flex justify-end gap-2">
    <Button size="small" variant="contained" color="success" startIcon={<CheckRoundedIcon />} disabled={busyId === row.id} onClick={() => onDecide(row, "APPROVED")}>{busyId === row.id ? "Saving…" : "Approve"}</Button>
    <Button size="small" variant="outlined" color="error" startIcon={<CloseRoundedIcon />} disabled={busyId === row.id} onClick={() => onDecide(row, "REJECTED")}>Reject</Button>
  </div>} />;
}
