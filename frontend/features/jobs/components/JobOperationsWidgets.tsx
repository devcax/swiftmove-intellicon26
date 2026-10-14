"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import StatusChip from "@/components/StatusChip";
import { EmptyState } from "@/shared/components/EmptyState";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { useLiveJobs } from "../hooks/useLiveJobs";

function Widget({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <Paper component="section" sx={{ border: 0, borderRadius: 1.5, p: 3, height: 360, display: "flex", flexDirection: "column" }}>
    <Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>{title}</Typography>
    <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.5, mb: 2.5 }}>{subtitle}</Typography>
    <Box className="panel-scroll" sx={{ flex: 1, minHeight: 0, overflow: "auto", mr: -2, pr: 3.5 }}>{children}</Box>
  </Paper>;
}

/** Operational events and outstanding incidents from the live jobs API. */
export function JobOperationsWidgets() {
  const { jobs, error } = useLiveJobs();
  const activity = (jobs ?? []).filter((job) => job.lastEventType && job.lastEventAt)
    .sort((a, b) => new Date(b.lastEventAt!).getTime() - new Date(a.lastEventAt!).getTime());
  const attention = (jobs ?? []).filter((job) => job.openIncidents > 0 || job.status === "DELAYED" || job.assignmentStatus === "CANCELLATION_REVIEW");
  const state = (title: string, description: string) => error && !jobs ? <Alert severity="warning">{error}</Alert>
    : jobs === null ? <SectionPreloader label="Loading live jobs…" /> : <EmptyState title={title} description={description} />;
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mt: 3 }}>
    <Widget title="Live job activity" subtitle="Latest workflow event for each active trip">
      {activity.length === 0 ? state("No live activity yet", "Workflow updates will appear when deliveries are underway.") : activity.map((job) => <Box key={job.id} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1.75, borderBottom: "1px dashed #e2e8f0", "&:first-of-type": { pt: 0 }, "&:last-child": { borderBottom: 0 } }}>
        <Avatar variant="rounded" sx={{ width: 38, height: 38, bgcolor: "#edf2fc", color: "#1e3a8a" }}><LocalShippingOutlinedIcon sx={{ fontSize: 20 }} /></Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component={Link} href={`/jobs/${job.id}`} sx={{ fontSize: 13, fontWeight: 600, color: "#1e3a8a", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{job.jobNumber}</Typography>
          <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 0.25 }}>{job.lastEventType?.replace(/_/g, " ")}</Typography>
          <Typography sx={{ fontSize: 11, color: "#64748b", mt: 0.5 }}>{new Date(job.lastEventAt!).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Typography>
        </Box>
      </Box>)}
    </Widget>
    <Widget title="Needs attention" subtitle="Open incidents, delays, and cancellation reviews">
      {attention.length === 0 ? state("No trips need attention", "Delays and delivery exceptions will appear here.") : attention.map((job) => <Box key={job.id} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, p: 1.5, mb: 1.25, borderRadius: 1, bgcolor: "#fff7ed" }}>
        <ReportProblemOutlinedIcon sx={{ color: "#92400e", fontSize: 21, mt: 0.25 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component={Link} href={`/jobs/${job.id}`} sx={{ fontSize: 13, fontWeight: 600, color: "#92400e", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{job.jobNumber}</Typography>
          <Typography sx={{ fontSize: 12, color: "#64748b", my: 0.75 }}>{job.driver ?? "Unassigned"} · {job.openIncidents} open incidents</Typography>
          <StatusChip status={job.assignmentStatus === "CANCELLATION_REVIEW" ? "CANCELLATION_REVIEW" : job.status} />
        </Box>
      </Box>)}
    </Widget>
  </Box>;
}
