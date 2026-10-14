import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { FormTextField } from "@/shared/components/FormTextField";
import { vehicleTypes } from "../format";
import type { DriverFormField, DriverFormValues, DriverStatus } from "../types";

interface DriverFormFieldsProps {
  mode: "create" | "edit"; form: DriverFormValues; status: DriverStatus;
  onStatusChange: (status: DriverStatus) => void;
  errorFor: (field: DriverFormField) => string | undefined;
  onChange: (field: DriverFormField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (field: DriverFormField) => () => void;
  disabled: boolean;
}

/** Shared labeled contact, vehicle, and access fields for driver registration and editing. */
export function DriverFormFields({ mode, form, status, onStatusChange, errorFor, onChange, onBlur, disabled }: DriverFormFieldsProps) {
  const field = (name: DriverFormField) => ({
    value: form[name], onChange: onChange(name), onBlur: onBlur(name),
    error: Boolean(errorFor(name)), helperText: errorFor(name), disabled,
  });
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
    <Typography component="h2" sx={{ gridColumn: "1 / -1", fontSize: 15, fontWeight: 600 }}>Contact details</Typography>
    <FormTextField required label="Full name" placeholder="e.g. Nuwan Perera" autoComplete="name" {...field("fullName")} />
    <FormTextField required label="WhatsApp number" placeholder="77 123 4567" autoComplete="tel" {...field("phone")}
      helperText={errorFor("phone") ?? (mode === "edit" ? "Changing the number requires verification again." : "Sri Lankan mobile number used for WhatsApp.")}
      slotProps={{ input: { startAdornment: <InputAdornment position="start">+94</InputAdornment> }, htmlInput: { inputMode: "tel" } }} />
    <Typography component="h2" sx={{ gridColumn: "1 / -1", fontSize: 15, fontWeight: 600, mt: 1 }}>Vehicle details</Typography>
    <FormTextField required label="Vehicle type" select {...field("vehicleType")}>
      {vehicleTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
    </FormTextField>
    <FormTextField required label="License plate" placeholder="ED-1234" {...field("licensePlate")} />
    {mode === "edit" && <FormTextField label="Account status" select value={status} onChange={(event) => onStatusChange(event.target.value as DriverStatus)} disabled={disabled}
      helperText="Controls this driver's access to the WhatsApp bot." sx={{ gridColumn: "1 / -1" }}>
      {["ACTIVE", "INACTIVE", "SUSPENDED"].map((value) => <MenuItem key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</MenuItem>)}
    </FormTextField>}
  </Box>;
}
