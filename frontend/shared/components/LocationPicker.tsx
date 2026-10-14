"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import type { GeoPoint } from "@/shared/types/location";
import { useLocationAddress } from "@/shared/hooks/useLocationAddress";
import { FormTextField } from "./FormTextField";
import { SectionPreloader } from "./SectionPreloader";

const LocationMap = dynamic(() => import("./LocationMap").then((module) => module.LocationMap), { ssr: false, loading: () => <SectionPreloader label="Loading map…" /> });

/** The address is derived from the selected pin and remains selectable for copying. */
export function LocationPicker({ label, name, point, onPointChange, error, disabled = false }: {
  label: string; name: string; point: GeoPoint | null;
  onPointChange: (point: GeoPoint, address: string) => void; error?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const address = useLocationAddress(onPointChange);
  const fieldError = address.error || error;
  return <Box>
    <FormTextField label={label} required value={name} disabled={disabled} placeholder={address.loading ? "Finding address…" : "Choose a pin on the map"}
      error={Boolean(fieldError)} helperText={address.loading ? "Finding the address for your pin…" : fieldError}
      slotProps={{ input: { readOnly: true, endAdornment: address.loading ? <InputAdornment position="end"><CircularProgress size={18} aria-label="Finding address" /></InputAdornment> : undefined }, inputLabel: { shrink: true }, htmlInput: { title: name, 'aria-busy': address.loading } }} />
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 0.75 }}>
      <Button size="small" startIcon={<MapOutlinedIcon />} disabled={disabled} onClick={() => setOpen((value) => !value)} aria-expanded={open}>{open ? "Hide map" : point ? "Change map pin" : "Choose on map"}</Button>
      <Typography sx={{ fontSize: 11, color: "#64748b" }}>{point ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}` : "A map pin is required"}</Typography>
      {address.error && point && <Button size="small" disabled={disabled || address.loading} onClick={() => address.select(point)}>Retry address</Button>}
    </Box>
    <Collapse in={open} unmountOnExit><Box sx={{ mt: 1 }}>
      <Typography sx={{ fontSize: 11.5, color: "#64748b", mb: 1 }}>Click to place a pin or drag it to the exact site. Use arrow keys and Enter to select with the keyboard.</Typography>
      <LocationMap point={point} onSelect={address.select} disabled={disabled} />
      <Typography sx={{ fontSize: 10, color: "#64748b", mt: 0.75 }}>Address data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></Typography>
    </Box></Collapse>
  </Box>;
}
