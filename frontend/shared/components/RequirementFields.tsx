"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { RequirementField } from "../api/requirements";
import { isCollectable, type RequirementErrors, type RequirementValue, type RequirementValues } from "@/features/evidence/values";

const labelSx = {
  color: "#64748b", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", mb: 0.75, display: "block",
} as const;

const ACCEPT = "image/jpeg,image/png,application/pdf";
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface ControlProps {
  field: RequirementField;
  value: RequirementValue;
  error?: string;
  disabled: boolean;
  onChange: (value: RequirementValue) => void;
}

function Control({ field, value, error, disabled, onChange }: ControlProps) {
  switch (field.type) {
    case "DOCUMENT":
      return (
        <div>
          <Button variant="outlined" component="label" size="small" disabled={disabled}>
            {value.file ? "Change file" : "Choose file"}
            <input hidden type="file" accept={ACCEPT} onChange={(event) => onChange({ file: event.target.files?.[0] ?? null })} />
          </Button>
          <Typography variant="caption" sx={{ ml: 1.5, color: "text.secondary" }}>
            {value.file ? value.file.name : "JPEG, PNG or PDF, up to 10 MB"}
          </Typography>
          {error && <FormHelperText error>{error}</FormHelperText>}
        </div>
      );
    case "CONFIRMATION":
      return (
        <div>
          <FormControlLabel
            control={<Checkbox size="small" checked={value.confirmed ?? false} disabled={disabled} onChange={(event) => onChange({ confirmed: event.target.checked })} />}
            label={<Typography variant="body2">{capitalize(field.label)}</Typography>}
          />
          {error && <FormHelperText error>{error}</FormHelperText>}
        </div>
      );
    case "TEXT":
      return (
        <TextField
          fullWidth size="small" multiline minRows={2} value={value.text ?? ""} disabled={disabled} error={Boolean(error)} helperText={error}
          onChange={(event) => onChange({ text: event.target.value.slice(0, 500) })}
        />
      );
    case "LOCATION":
      return <LocationControl value={value} error={error} disabled={disabled} onChange={onChange} />;
    default:
      return null;
  }
}

function LocationControl({ value, error, disabled, onChange }: Omit<ControlProps, "field">) {
  const [locating, setLocating] = React.useState(false);
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({ lat: position.coords.latitude.toFixed(6), lng: position.coords.longitude.toFixed(6) });
        setLocating(false);
      },
      () => setLocating(false),
    );
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <TextField size="small" label="Latitude" value={value.lat ?? ""} disabled={disabled} error={Boolean(error)} onChange={(event) => onChange({ ...value, lat: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
        <TextField size="small" label="Longitude" value={value.lng ?? ""} disabled={disabled} error={Boolean(error)} onChange={(event) => onChange({ ...value, lng: event.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
      </div>
      <Button size="small" sx={{ mt: 0.5 }} onClick={useMyLocation} disabled={disabled || locating}>
        {locating ? "Finding you…" : "Use my location"}
      </Button>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </div>
  );
}

interface RequirementFieldsProps {
  fields: RequirementField[];
  notices: { message: string; policyKey: string }[];
  values: RequirementValues;
  onChange: (name: string, value: RequirementValue) => void;
  errors?: RequirementErrors;
  disabled?: boolean;
}

/**
 * The extra things a policy asks for, drawn from what the server reports, so a new policy adds a field with no change here.
 * A type this component does not know is shown as a notice, never a crash: the server check stays the guard. Notices go in an
 * info box. Put this above the submit button.
 */
export function RequirementFields({ fields, notices, values, onChange, errors = {}, disabled = false }: RequirementFieldsProps) {
  const unknown = fields.filter((field) => !isCollectable(field));
  const collectable = fields.filter(isCollectable);
  const messages = [...notices.map((n) => n.message), ...unknown.map((f) => `The ${f.label} is needed, and has to be provided another way.`)];
  if (collectable.length === 0 && messages.length === 0) return null;
  return (
    <>
      {collectable.map((field) => (
        <div key={field.name}>
          <Typography variant="caption" sx={labelSx}>
            {capitalize(field.label)}
          </Typography>
          <Control field={field} value={values[field.name] ?? {}} error={errors[field.name]} disabled={disabled} onChange={(next) => onChange(field.name, next)} />
        </div>
      ))}
      {messages.length > 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {messages.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </Alert>
      )}
    </>
  );
}
