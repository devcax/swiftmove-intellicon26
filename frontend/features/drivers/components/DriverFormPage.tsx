"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { EmptyState } from "@/shared/components/EmptyState";
import { dashboardPageWidth } from "@/shared/styles/pageLayout";
import { useDrivers } from "../hooks/useDrivers";
import { DriverForm } from "./DriverForm";

export function DriverFormPage({ mode, driverId }: { mode: "create" | "edit"; driverId?: string }) {
  const router = useRouter();
  const { drivers, loadError, reload } = useDrivers();
  const driver = drivers?.find((item) => item.id === driverId);
  return <Box sx={{ ...dashboardPageWidth, display: "flex", flexDirection: "column", gap: 2.5, py: { xs: 1.5, sm: 2.5 } }}>
    <Box><Button component={Link} href="/drivers" variant="outlined" startIcon={<ArrowBackRoundedIcon />}>All drivers</Button></Box>
    {loadError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void reload()}>Retry</Button>}>{loadError}</Alert>}
    {!drivers ? <Paper sx={{ p: 3, border: 0 }}><SectionPreloader label="Loading driver registration…" /></Paper>
      : mode === "edit" && !driver ? <Paper sx={{ border: 0 }}><EmptyState title={loadError ? "Driver unavailable" : "Driver not found"} description="Retry loading or return to the driver registry to select a driver." /></Paper>
      : <DriverForm key={driver?.id ?? "new"} mode={mode} driver={driver} existingPhones={drivers.filter((item) => item.id !== driverId).map((item) => item.phone)} onSaved={() => router.push("/drivers")} />}
  </Box>;
}
