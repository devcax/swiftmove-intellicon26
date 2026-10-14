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
    <Typography component="h2" sx={{ gridColumn: "1 / -1", fontSize: 15, fontWeight: 600, mt: 1 }}>Personal details <Typography component="span" sx={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>(optional)</Typography></Typography>
    <FormTextField label="Residential address" multiline minRows={2} autoComplete="street-address" {...field("address")} slotProps={{ htmlInput: { maxLength: 1000 } }} sx={{ gridColumn: "1 / -1" }} />
    <FormTextField label="NIC number" placeholder="National identity card number" {...field("nic")} slotProps={{ htmlInput: { maxLength: 20 } }} />
    <FormTextField label="Date of birth" type="date" autoComplete="bday" {...field("dateOfBirth")} slotProps={{ inputLabel: { shrink: true } }} />
    <Typography component="h2" sx={{ gridColumn: "1 / -1", fontSize: 15, fontWeight: 600, mt: 1 }}>Vehicle details</Typography>
    <FormTextField required label="Vehicle type" select {...field("vehicleType")}>
      {vehicleTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
    </FormTextField>
    {form.vehicleType === "Other" && <FormTextField required label="Other vehicle type" placeholder="Enter the vehicle type name" autoFocus {...field("otherVehicleType")} slotProps={{ htmlInput: { maxLength: 60 } }} />}
    <FormTextField required label="License plate" placeholder="ED-1234" {...field("licensePlate")} />
    <Typography component="h2" sx={{ gridColumn: "1 / -1", fontSize: 15, fontWeight: 600, mt: 1 }}>Bank details <Typography component="span" sx={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>(optional)</Typography></Typography>
    <FormTextField label="Bank name" {...field("bankName")} slotProps={{ htmlInput: { maxLength: 160 } }} />
    <FormTextField label="Branch" {...field("bankBranch")} slotProps={{ htmlInput: { maxLength: 160 } }} />
    <FormTextField label="Account holder name" {...field("bankAccountHolder")} slotProps={{ htmlInput: { maxLength: 160 } }} />
    <FormTextField label="Account number" {...field("bankAccountNumber")} helperText={errorFor("bankAccountNumber") ?? "Enter exactly as issued by the bank, including leading zeros."} slotProps={{ htmlInput: { maxLength: 80 } }} />
    {mode === "edit" && <FormTextField label="Account status" select value={status} onChange={(event) => onStatusChange(event.target.value as DriverStatus)} disabled={disabled}
      helperText="Controls this driver's access to the WhatsApp bot." sx={{ gridColumn: "1 / -1" }}>
      {["ACTIVE", "INACTIVE", "SUSPENDED"].map((value) => <MenuItem key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</MenuItem>)}
    </FormTextField>}
  </Box>;
}
