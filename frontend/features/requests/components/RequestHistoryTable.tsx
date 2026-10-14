"use client";
import Chip from "@mui/material/Chip";
import StatusChip from "@/components/StatusChip";
import { timeAgo } from "@/lib/format";
import { REQUEST_TYPE_META } from "../constants";
import type { ApiRequestHistoryEntry } from "../types";
import { QueueTable } from "./QueueTable";
import { QueueJobCell, QueueDriverCell } from "./QueueCells";

export function RequestHistoryTable({ requestHistory, error }: { requestHistory: ApiRequestHistoryEntry[] | null; error: string | null }) {
  return <QueueTable rows={requestHistory} error={error} label="Request history" emptyMessage="No reviewed requests yet" columns={[
    { key: "type", label: "Type", render: row => { const meta = REQUEST_TYPE_META[row.type]; return <Chip size="small" label={meta.label} sx={{ bgcolor: meta.bg, color: meta.fg, fontSize: 11, height: 24 }} />; } },
    { key: "job", label: "Job / Route", render: row => <QueueJobCell job={row.job} /> },
    { key: "driver", label: "Driver", render: row => <QueueDriverCell driver={row.driver} /> },
    { key: "cargo", label: "Cargo", render: row => row.job.cargo ?? "—" },
    { key: "decision", label: "Decision", render: row => <StatusChip status={row.decision} /> },
    { key: "reviewed", label: "Reviewed", render: row => timeAgo(row.decidedAt) },
  ]} />;
}
