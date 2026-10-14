import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { initials } from "@/lib/format";

export function QueueJobCell({ job }: { job: { id: string; jobNumber: string; pickup: string | null; delivery: string | null } }) {
  return <Box><Typography component={Link} href={`/jobs/${job.id}`} sx={{ fontSize: 12.5, fontWeight: 600, color: "#1e3a8a", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{job.jobNumber}</Typography>
    <Typography sx={{ fontSize: 11, color: "#64748b" }}>{job.pickup ?? "—"} → {job.delivery ?? "—"}</Typography></Box>;
}

export function QueueDriverCell({ driver }: { driver: { name: string; phone: string; verified: boolean } }) {
  return <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Avatar sx={{ width: 32, height: 32, fontSize: 11, bgcolor: "#eef2ff", color: "#1e3a8a" }}>{initials(driver.name)}</Avatar>
    <Box><Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{driver.name}</Typography>{driver.verified && <VerifiedRoundedIcon sx={{ fontSize: 14, color: "#1e3a8a" }} />}</Box>
      <Typography sx={{ fontSize: 11, color: "#64748b" }}>{driver.phone}</Typography></Box>
  </Box>;
}
