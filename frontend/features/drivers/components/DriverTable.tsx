"use client";

import Link from "next/link";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import StatusChip from "@/components/StatusChip";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { FormTextField } from "@/shared/components/FormTextField";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { formatPhoneDisplay } from "../format";
import type { Driver, DriverStatus } from "../types";
import { DriverActions } from "./DriverActions";

const columns: DataTableColumn<Driver>[] = [
  { key: "number", label: "No", width: 50, render: (_, index) => index + 1 },
  { key: "driver", label: "Driver", render: (driver) => <Box component={Link} href={`/drivers/${driver.id}`} sx={{ display: "flex", alignItems: "center", gap: 1.25, textDecoration: "none", borderRadius: 1, "&:hover .MuiTypography-root:first-of-type": { color: "primary.main", textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid #1e3a8a", outlineOffset: 4 } }}><Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: "#edf2fc", color: "#1e3a8a", fontSize: 12, fontWeight: 600 }}><PersonOutlineRoundedIcon sx={{ fontSize: 22 }} /></Avatar><Box><Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{driver.name}</Typography><Typography sx={{ fontSize: 11, color: "#64748b" }}>{driver.licensePlate ?? "No license plate"}</Typography></Box></Box> },
  { key: "phone", label: "WhatsApp", render: (driver) => <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, whiteSpace: "nowrap" }}><WhatsAppIcon sx={{ fontSize: 16, color: "#15803d" }} />{formatPhoneDisplay(driver.phone)}{driver.verified ? <VerifiedRoundedIcon aria-label="Verified number" sx={{ fontSize: 16, color: "#1e3a8a" }} /> : <Chip size="small" label="Awaiting activation" sx={{ height: 20, fontSize: 10, bgcolor: "#fff4e5", color: "#92400e" }} />}</Box> },
  { key: "vehicle", label: "Vehicle", render: (driver) => driver.vehicleType ?? "Unspecified" },
  { key: "status", label: "Status", render: (driver) => <StatusChip status={driver.status} /> },
  { key: "job", label: "Current job", render: (driver) => driver.currentJob ? <Chip size="small" label={driver.currentJob} sx={{ bgcolor: "#edf2fc", color: "#1e3a8a", fontSize: 11 }} /> : "Idle" },
  { key: "trips", label: "Trips", align: "center", render: (driver) => driver.completedTrips },
];

interface DriverTableProps {
  drivers: Driver[] | null; visible: Driver[]; query: string; onQueryChange: (query: string) => void;
  loadError: string | null; onRetry: () => void; onEdit: (driver: Driver) => void; onResendActivation: (driver: Driver) => void;
  onStatusChange: (id: string, status: DriverStatus) => void; onDelete: (driver: Driver) => void;
}

export function DriverTable({ drivers, visible, query, onQueryChange, loadError, onRetry, onEdit, onResendActivation, onStatusChange, onDelete }: DriverTableProps) {
  return <Paper component="section" sx={{ border: 0, borderRadius: 1.5, overflow: "hidden" }}>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, p: 3, borderBottom: "1px solid #eef0f4" }}>
      <Box><Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>Driver registry</Typography><Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.5 }}>Contact details, vehicle assignments, and bot access</Typography></Box>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: { xs: "wrap", sm: "nowrap" }, gap: 1.5, width: { xs: "100%", sm: "auto" } }}>
      <FormTextField label="Search drivers" placeholder="Name, number, or job" value={query} onChange={(event) => onQueryChange(event.target.value)} sx={{ width: { xs: "100%", sm: 300 } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 19 }} /></InputAdornment> } }} />
      <Button component={Link} href="/drivers/new" variant="contained" startIcon={<PersonAddAlt1RoundedIcon />} sx={{ height: 48, flexShrink: 0 }}>Add Driver</Button>
      </Box>
    </Box>
    {loadError && <Alert severity="warning" sx={{ m: 2 }} action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>{loadError}</Alert>}
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: { xs: 1.5, sm: 3 } }}>
      <DataTable key={query} columns={columns} rows={visible} getRowKey={(driver) => driver.id} label="Drivers" scrollMode="page" pageSize={10} minWidth={1100} loading={drivers === null && !loadError}
        emptyMessage={query ? "No drivers match your search" : "No drivers registered yet"}
        renderActions={(driver) => <DriverActions driver={driver} onEdit={onEdit} onResendActivation={onResendActivation} onStatusChange={onStatusChange} onDelete={onDelete} />} />
    </Box>
  </Paper>;
}
