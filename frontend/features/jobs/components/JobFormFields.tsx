"use client";

import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { FormTextField } from "@/shared/components/FormTextField";
import { LocationPicker } from "@/shared/components/LocationPicker";
import type { GeoPoint } from "@/shared/types/location";
import { DRIVER_DISCOVERY_WINDOW_NOTE, MAX_DELIVERY_WINDOW_MS, units } from "../constants";
import { toLocalInput, oneHourFromNowLocalInput } from "../listing";
import type { JobFormErrors, JobFormField, JobFormValues } from "../schemas";

interface JobFormFieldsProps {
  mode: "create" | "edit"; values: JobFormValues; errors: JobFormErrors; minPickupAt?: string; disabled?: boolean;
  onChange: (field: JobFormField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onLocationChange: (stage: "pickup" | "delivery", point: GeoPoint, address: string) => void;
}

export function JobFormFields({ mode, values, errors, minPickupAt, disabled = false, onChange, onLocationChange }: JobFormFieldsProps) {
  const creating = mode === "create";
  const time = values.pickupAt ? new Date(values.pickupAt).getTime() : NaN;
  const maxDeliveryAt = Number.isFinite(time) ? toLocalInput(new Date(time + MAX_DELIVERY_WINDOW_MS).toISOString()) : undefined;
  const minimumPickup = creating ? (minPickupAt && minPickupAt > oneHourFromNowLocalInput() ? minPickupAt : oneHourFromNowLocalInput()) : toLocalInput(new Date().toISOString());
  const point = (stage: "pickup" | "delivery"): GeoPoint | null => values[`${stage}Latitude`] && values[`${stage}Longitude`] ? { latitude: Number(values[`${stage}Latitude`]), longitude: Number(values[`${stage}Longitude`]) } : null;
  const field = (name: JobFormField) => ({
    value: values[name], onChange: onChange(name), disabled,
    error: Boolean(errors[name]) && values[name] !== "", helperText: values[name] !== "" ? errors[name] : undefined,
  });
  const heading = (text: string) => <Typography component="h2" sx={{ gridColumn: "1 / -1", fontSize: 15, fontWeight: 600 }}>{text}</Typography>;
  return <>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 3 }}>
      {heading("Job identifiers")}
      {(["jobNumber", "pickupCode", "deliveryCode"] as const).map((name) => <FormTextField key={name} label={{ jobNumber: "Job number", pickupCode: "Pickup code", deliveryCode: "Delivery code" }[name]} value={values[name]} slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }} />)}
      <Typography sx={{ gridColumn: "1 / -1", fontSize: 12, color: "#64748b" }}>Auto-generated identifiers. Security codes are for pickup and delivery site staff, never the driver.</Typography>
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
      {heading("Route and schedule")}
      {(["pickup", "delivery"] as const).map((stage) => <LocationPicker key={stage} label={stage === "pickup" ? "Pickup location" : "Delivery location"} name={values[`${stage}Location`]} point={point(stage)} onPointChange={(position, address) => onLocationChange(stage, position, address)} disabled={disabled}
        error={values[`${stage}Location`] ? errors[`${stage}Location`] ?? (point(stage) ? undefined : "Choose a pin on the map") : undefined} />)}
      <FormTextField required label="Pickup date and time" type="datetime-local" {...field("pickupAt")} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minimumPickup } }} />
      <FormTextField required label="Delivery date and time" type="datetime-local" {...field("deliveryAt")} disabled={disabled || !values.pickupAt}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: values.pickupAt || undefined, max: maxDeliveryAt } }} />
      {creating && <Typography sx={{ gridColumn: "1 / -1", fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>{DRIVER_DISCOVERY_WINDOW_NOTE}</Typography>}
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" }, gap: 3 }}>
      {heading("Cargo details")}
      <FormTextField required label="Cargo description" placeholder="e.g. Mixed FMCG cartons" {...field("cargo")} />
      <FormTextField required={creating} label="Quantity" type="number" placeholder="18" {...field("quantity")} slotProps={{ htmlInput: { min: 0 } }} />
      <FormTextField required={creating} label="Unit" select {...field("unit")}>{units.map((unit) => <MenuItem key={unit} value={unit}>{unit}</MenuItem>)}</FormTextField>
      {values.unit === "Other" && <FormTextField required label="Custom unit name" placeholder="e.g. Crates" {...field("customUnit")} helperText={errors.customUnit ?? "Enter the unit used to measure this cargo."} error={Boolean(errors.customUnit)} slotProps={{ htmlInput: { maxLength: 60 } }} sx={{ gridColumn: { xs: "auto", md: "2 / -1" } }} />}
      <FormTextField label="Special instructions" multiline minRows={3} placeholder="Handling notes, dock access, contact persons…" {...field("instructions")} sx={{ gridColumn: "1 / -1" }} />
    </Box>
  </>;
}
