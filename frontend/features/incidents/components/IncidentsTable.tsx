"use client";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { TableActionButton } from "@/shared/components/TableActionButton";
import type { ApiIncidentSummary } from "../types";
import { SEVERITY_TONE, STATUS_TONE } from "../constants";
import { fmtDateTime, humanize, initials } from "@/lib/format";
import { IncidentBadge } from "./IncidentBadge";

export function IncidentsTable({ incidents, error, onOpen }: { incidents: ApiIncidentSummary[] | null; error: string | null; onOpen: (id: string) => void }) {
  const columns: DataTableColumn<ApiIncidentSummary>[] = [
    { key: "number", label: "No", width: 45, render: (_, index) => index + 1 },
    { key: "incident", label: "Incident", render: incident => <Box>
      <Button variant="text" onClick={() => onOpen(incident.id)} startIcon={<ReportProblemRoundedIcon sx={{ color: SEVERITY_TONE[incident.severity].fg }} />} sx={{ p: 0, minWidth: 0, fontSize: 12.5, fontWeight: 600, textTransform: "none", justifyContent: "flex-start" }}>{humanize(incident.type)}</Button>
      <Tooltip title={incident.description ?? "No description"}><Typography noWrap sx={{ maxWidth: 320, fontSize: 11, color: "#64748b" }}>{incident.description ?? "No description"}</Typography></Tooltip>
    </Box> },
    { key: "job", label: "Job", render: incident => <Typography component={Link} href={`/jobs/${incident.job.id}`} sx={{ fontSize: 12, fontWeight: 600, color: "#1e3a8a", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{incident.job.jobNumber}</Typography> },
    { key: "driver", label: "Driver", render: incident => <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Avatar sx={{ width: 30, height: 30, fontSize: 10.5, bgcolor: "#eef2ff", color: "#1e3a8a" }}>{initials(incident.driver)}</Avatar>{incident.driver}</Box> },
    { key: "severity", label: "Severity", render: incident => <IncidentBadge label={humanize(incident.severity)} tone={SEVERITY_TONE[incident.severity] ?? SEVERITY_TONE.LOW} /> },
    { key: "reported", label: "Reported", render: incident => fmtDateTime(incident.reportedAt, "—") },
    { key: "status", label: "Status", render: incident => <IncidentBadge label={humanize(incident.status)} tone={STATUS_TONE[incident.status] ?? STATUS_TONE.OPEN} /> },
  ];
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  return <DataTable rows={incidents ?? []} columns={columns} getRowKey={incident => incident.id} label="Incident register" loading={incidents === null}
    emptyMessage="No incidents match this filter" scrollMode="page" compact singleLine pinActions pageSize={8} minWidth={960}
    renderActions={incident => <TableActionButton label={`View ${humanize(incident.type)} incident`} icon={<VisibilityOutlinedIcon />} onClick={() => onOpen(incident.id)} />} />;
}
