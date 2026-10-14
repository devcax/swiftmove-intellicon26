"use client";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { EmptyState } from "@/shared/components/EmptyState";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { LiveJobCard } from "@/features/jobs/components/LiveJobCard";
import { useLiveJobs } from "@/features/jobs/hooks/useLiveJobs";

export default function LiveJobsPage() {
  const { jobs, error } = useLiveJobs();
  return <Box sx={{ width: "100%", maxWidth: 1500, mx: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2.5 }}>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
      <Box><Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Typography component="h1" sx={{ fontSize: 20, fontWeight: 700 }}>Live jobs</Typography><Chip size="small" label={jobs === null ? "Loading…" : `${jobs.length} live`} sx={{ bgcolor: jobs?.length ? "#ecfdf5" : "#eef2ff", color: jobs?.length ? "#047857" : "#1e3a8a", fontSize: 11, fontWeight: 600 }} /></Box>
        <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 12 }}>Current trips, driver updates, and exceptions in one place.</Typography></Box>
      <Button component={Link} href="/requests" variant="outlined" size="small" startIcon={<PlaylistAddCheckRoundedIcon />}>Open requests</Button>
    </Box>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {jobs === null && !error && <Paper sx={{ p: 3, borderRadius: 1.5 }}><SectionPreloader label="Loading live jobs…" /></Paper>}
    {jobs !== null && jobs.length === 0 && !error && <Paper sx={{ borderRadius: 1.5, minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3, boxShadow: "0 2px 6px rgba(15,23,42,0.04)" }}>
      <EmptyState title="No live trips right now" description="Trips appear here when a job is assigned and moves through pickup and delivery." icon={<LocalShippingOutlinedIcon />} />
      <Button component={Link} href="/jobs" size="small" variant="outlined">View all jobs</Button>
    </Paper>}
    {jobs !== null && jobs.length > 0 && <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>{jobs.map(job => <LiveJobCard key={job.id} job={job} />)}</Box>}
  </Box>;
}
