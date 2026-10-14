"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Avatar, Box, Button, Chip, Paper, Tab, Tabs, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import StatusChip from "@/components/StatusChip";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { initials, humanize } from "@/lib/format";
import { fetchDriverProfile } from "../api";
import { formatPhoneDisplay } from "../format";
import type { DriverProfile } from "../schemas";

type Trip = DriverProfile["trips"][number];
const date = (value: string) => new Date(value).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const columns: DataTableColumn<Trip>[] = [
  { key: "job", label: "Job", render: (trip) => <Link href={`/jobs/${trip.job.id}`} style={{ color: "#1e3a8a", fontWeight: 600 }}>{trip.job.jobNumber}</Link> },
  { key: "cargo", label: "Cargo", render: (trip) => trip.job.cargoDescription },
  { key: "assigned", label: "Assigned", render: (trip) => date(trip.assignedAt) },
  { key: "status", label: "Assignment", render: (trip) => humanize(trip.status) },
  { key: "jobStatus", label: "Job status", render: (trip) => <StatusChip status={trip.job.currentStatus} /> },
];
const panel = { p: { xs: 2, sm: 3 }, border: 0, borderRadius: 1.5 };

function Activity({ driver, full = false }: { driver: DriverProfile; full?: boolean }) {
  const milestones = driver.trips.flatMap((trip) => ([
    { at: trip.assignedAt, title: "Assigned to job", color: "#1e3a8a" },
    { at: trip.acceptedAt, title: "Accepted assignment", color: "#7c3aed" },
    { at: trip.startedAt, title: "Started trip", color: "#0f766e" },
    { at: trip.completedAt, title: "Completed trip", color: "#16a34a" },
    { at: trip.cancelledAt, title: "Assignment cancelled", color: "#d97706" },
  ].filter((entry): entry is { at: string; title: string; color: string } => Boolean(entry.at))
    .map((entry) => ({ ...entry, job: trip.job }))));
  milestones.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return <Paper sx={panel}>
    <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700, mb: 0.5 }}>Activity</Typography>
    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2.5 }}>Milestones from the latest 100 assignments</Typography>
    {!milestones.length ? <EmptyState title="No trip activity yet" description="Assignment milestones will appear here when this driver takes a job." /> :
      <Box sx={{ maxHeight: full ? 650 : 430, overflowY: "auto", pr: 1 }}>
        {milestones.map((entry, index) => <Box key={`${entry.job.id}-${entry.title}-${entry.at}-${index}`} sx={{ position: "relative", ml: 0.75, pl: 3, pb: 3, borderLeft: "2px solid #edf0f4", "&:last-child": { pb: 0 } }}>
          <Box sx={{ position: "absolute", left: -6, top: 5, width: 10, height: 10, borderRadius: "50%", bgcolor: entry.color, outline: "4px solid #fff" }} />
          <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.5 }}>{date(entry.at)}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{entry.title}</Typography>
          <Typography component={Link} href={`/jobs/${entry.job.id}`} sx={{ fontSize: 12, color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{entry.job.jobNumber}</Typography>
        </Box>)}
      </Box>}
  </Paper>;
}

export function DriverProfilePage({ driverId }: { driverId: string }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState("overview");
  useEffect(() => {
    let cancelled = false;
    fetchDriverProfile(driverId).then((value) => { if (!cancelled) { setDriver(value); setError(null); } })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load this driver."); });
    return () => { cancelled = true; };
  }, [driverId, attempt]);
  return <Box sx={{ width: "100%", maxWidth: 1500, mx: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2.5 }}>
    <Button component={Link} href="/drivers" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 2 }}>Back to drivers</Button>
    {error ? <Alert severity="error" action={<Button color="inherit" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>}>{error}</Alert> : !driver ? <SectionPreloader label="Loading driver profile…" /> : <>
      <Paper sx={{ border: 0, borderRadius: 1.5, overflow: "hidden", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: { xs: 2, sm: 3 }, p: { xs: 2, sm: 3.5 } }}>
          <Avatar variant="rounded" sx={{ width: { xs: 80, sm: 128 }, height: { xs: 80, sm: 128 }, bgcolor: "#edf2fc", color: "#1e3a8a", fontSize: { xs: 28, sm: 42 }, borderRadius: 2 }}>{initials(driver.name)}</Avatar>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1 }}>
              <Typography component="h1" sx={{ fontSize: { xs: 22, sm: 27 }, fontWeight: 700 }}>{driver.name}</Typography>
              {driver.verified && <VerifiedRoundedIcon aria-label="Verified WhatsApp number" sx={{ color: "#0f766e", fontSize: 23 }} />}
              <StatusChip status={driver.status} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, color: "text.secondary", mb: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: 13 }}><WhatsAppIcon sx={{ fontSize: 17 }} />{formatPhoneDisplay(driver.phone)}</Box>
              <Typography sx={{ fontSize: 13 }}>{driver.vehicleType ?? "Vehicle not specified"} · {driver.licensePlate ?? "No license plate"}</Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {[{ icon: <CheckCircleOutlineRoundedIcon />, value: driver.completedTrips, label: "Completed trips" }, { icon: <LocalShippingOutlinedIcon />, value: driver.currentJob ? "1" : "0", label: "Current job" }].map((metric) =>
                <Box key={metric.label} sx={{ display: "flex", alignItems: "center", gap: 1.25, border: "1px dashed #e2e8f0", borderRadius: 1.5, py: 1, px: 1.5, minWidth: 170 }}>
                  <Box sx={{ color: "#0f766e", bgcolor: "#ecfdf5", display: "flex", p: 1, borderRadius: 1 }}>{metric.icon}</Box>
                  <Box><Typography sx={{ fontWeight: 700, fontSize: 22, lineHeight: 1.2 }}>{metric.value}</Typography><Typography sx={{ fontSize: 12, color: "text.secondary" }}>{metric.label}</Typography></Box>
                </Box>)}
            </Box>
          </Box>
          <Button component={Link} href={`/drivers/${driver.id}/edit`} variant="contained" startIcon={<EditRoundedIcon />}>Edit driver</Button>
        </Box>
        <Tabs value={tab} onChange={(_, value: string) => setTab(value)} aria-label="Driver profile sections" sx={{ px: 2, borderTop: "1px solid #eef0f4" }}>
          <Tab id="driver-tab-overview" aria-controls="driver-profile-panel" value="overview" label="Overview" /><Tab id="driver-tab-trips" aria-controls="driver-profile-panel" value="trips" label="Trips" /><Tab id="driver-tab-activity" aria-controls="driver-profile-panel" value="activity" label="Activity" />
        </Tabs>
      </Paper>
      <Box role="tabpanel" id="driver-profile-panel" aria-labelledby={`driver-tab-${tab}`}>
        {tab === "overview" ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr 1fr" }, gap: 3, alignItems: "start" }}>
          <Paper sx={panel}><Typography component="h2" sx={{ fontSize: 18, fontWeight: 700, mb: 2 }}>Driver details</Typography>
            <Box component="dl" sx={{ m: 0 }}>{[
              ["WhatsApp", formatPhoneDisplay(driver.phone)], ["Verification", driver.verified ? "Verified" : "Awaiting activation"],
              ["Vehicle", driver.vehicleType ?? "Unspecified"], ["License plate", driver.licensePlate ?? "Not provided"],
              ["Bot access", driver.status === "ACTIVE" ? "Enabled" : "Disabled"], ["Registered", date(driver.createdAt)],
              ["Address", driver.address || "Not provided"], ["NIC", driver.nic || "Not provided"],
              ["Date of birth", driver.dateOfBirth ? new Date(`${driver.dateOfBirth}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : "Not provided"],
              ["Bank", driver.bankName || "Not provided"], ["Branch", driver.bankBranch || "Not provided"],
              ["Account holder", driver.bankAccountHolder || "Not provided"], ["Account number", driver.bankAccountNumber || "Not provided"],
            ].map(([label, value]) => <Box key={label} sx={{ py: 1.5, borderBottom: "1px solid #eef0f4", display: "flex", justifyContent: "space-between", gap: 2 }}><Typography component="dt" sx={{ fontSize: 12, color: "text.secondary" }}>{label}</Typography><Typography component="dd" sx={{ m: 0, fontSize: 12, textAlign: "right", fontWeight: 500 }}>{value}</Typography></Box>)}</Box>
          </Paper>
          <Paper sx={panel}><Typography component="h2" sx={{ fontSize: 18, fontWeight: 700, mb: 2 }}>Current assignment</Typography>
            {driver.activeJobId ? <><Chip label={driver.currentJob ?? "Assigned job"} sx={{ mb: 2, bgcolor: "#edf2fc", color: "primary.main" }} /><Typography sx={{ fontSize: 13, color: "text.secondary", mb: 3 }}>View the job for its route, schedule, cargo, and latest updates.</Typography><Button component={Link} href={`/jobs/${driver.activeJobId}`} variant="outlined" fullWidth>View job</Button></> : <EmptyState icon={<LocalShippingOutlinedIcon />} title="No active job" description="The next assigned job will appear here." />}
          </Paper>
          <Activity driver={driver} />
        </Box> : tab === "trips" ? <Paper sx={panel}><Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>Trip history</Typography><Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>Latest 100 assignments, newest first</Typography><DataTable columns={columns} rows={driver.trips} getRowKey={(trip) => trip.id} label="Driver trips" pageSize={10} minWidth={780} scrollMode="page" emptyMessage="No trip assignments yet" /></Paper> : <Activity driver={driver} full />}
      </Box>
    </>}
  </Box>;
}
