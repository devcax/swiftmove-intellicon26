"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { dashboardPageWidth } from "@/shared/styles/pageLayout";
import { CreateJobForm } from "./CreateJobForm";
import { EditJobForm } from "./EditJobForm";

export function JobFormPage({ jobId }: { jobId?: string }) {
  const router = useRouter();
  const saved = () => router.push("/jobs");
  return <Box sx={{ ...dashboardPageWidth, display: "flex", flexDirection: "column", gap: 2.5, py: { xs: 1.5, sm: 2.5 } }}>
    <Box><Button component={Link} href="/jobs" variant="outlined" startIcon={<ArrowBackRoundedIcon />}>All jobs</Button></Box>
    {jobId ? <EditJobForm key={jobId} jobId={jobId} onSaved={saved} /> : <CreateJobForm onCreated={saved} />}
  </Box>;
}
