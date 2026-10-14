"use client";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import StatusChip from "@/components/StatusChip";
import { initials, timeAgo, fmtDateTime, humanize } from "@/lib/format";
import type { ApiLiveJob } from "../types";
import { latestStatus } from "../detail";
import { LiveJobMilestones } from "./LiveJobMilestones";

/** Recorded milestones on the left; cargo, driver, addresses and schedule on the right. */
export function LiveJobCard({ job }: { job: ApiLiveJob }) {
  return <Paper component="article" aria-labelledby={`live-job-${job.id}`} sx={{ p: 2.5, borderRadius: 1.5, boxShadow: "0 2px 6px rgba(15,23,42,0.04)", display: "flex", flexDirection: "column", minWidth: 0 }}>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(135px, 0.8fr) minmax(0, 1.6fr)" }, gap: 2.5, flex: 1 }}>
      <LiveJobMilestones previousStatus={job.previousStatus} currentStatus={job.status} changedAt={job.milestoneChangedAt} />
      <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Typography id={`live-job-${job.id}`} component={Link} href={`/jobs/${job.id}`} sx={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{job.jobNumber}</Typography>
          <StatusChip status={latestStatus(job.status, job.assignmentStatus)} />
        </Box>
        <Box><Typography sx={{ fontSize: 14, fontWeight: 600 }}>{job.cargo || "Cargo details pending"}</Typography>{job.quantity && <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.5 }}>{job.quantity}</Typography>}</Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 10.5, bgcolor: "#eef2ff", color: "#1e3a8a" }}>{job.driver ? initials(job.driver) : "—"}</Avatar>
          <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{job.driver || "Awaiting driver"}</Typography>{job.driverPhone && <Typography component="a" href={`tel:${job.driverPhone}`} sx={{ fontSize: 11, color: "#64748b", textDecoration: "none" }}>{job.driverPhone}</Typography>}</Box>
        </Box>
        <Box component="dl" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, m: 0, pt: 1, borderTop: '1px solid #eef0f4' }}>
          {[
            { label: 'Pickup address', address: job.pickupAddress || job.pickup, when: job.pickupAt },
            { label: 'Destination address', address: job.deliveryAddress || job.delivery, when: job.deliveryAt },
          ].map(stop => <Box key={stop.label}>
            <Typography component="dt" sx={{ fontSize: 11, color: '#475569', mb: 0.5 }}>{stop.label}</Typography>
            <Box component="dd" sx={{ m: 0 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{stop.address || 'Address not provided'}</Typography>
              <Typography sx={{ fontSize: 11.5, color: '#475569', mt: 0.5 }}>{fmtDateTime(stop.when, 'Not scheduled')}</Typography>
            </Box>
          </Box>)}
        </Box>
        {job.openIncidents > 0 && <Chip size="small" icon={<ReportProblemRoundedIcon />} label={`${job.openIncidents} open incident${job.openIncidents === 1 ? "" : "s"}`} sx={{ alignSelf: "flex-start", bgcolor: "#fff1f2", color: "#be123c", fontSize: 10.5, "& .MuiChip-icon": { color: "#be123c", fontSize: 15 } }} />}
        {job.cancellationReason && <Typography sx={{ color: "#92400e", fontSize: 11.5 }}>Cancellation request: {job.cancellationReason}</Typography>}
      </Box>
    </Box>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mt: 2.5, pt: 1.5, borderTop: "1px solid #eef0f4" }}>
      <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 11.5, fontWeight: 500, color: "#475569" }}>{job.lastEventType ? humanize(job.lastEventType) : "No updates yet"}</Typography><Typography sx={{ fontSize: 10.5, color: "#64748b", mt: 0.25 }}>{timeAgo(job.lastEventAt, "Waiting for a driver update")}</Typography></Box>
      <Button component={Link} href={`/jobs/${job.id}`} size="small" variant="outlined" endIcon={<ArrowForwardRoundedIcon />}>Track job</Button>
    </Box>
  </Paper>;
}
