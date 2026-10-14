"use client";

import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { RequirementFields } from "@/shared/components/RequirementFields";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { useDriverForm, type DriverFormProps } from "../hooks/useDriverForm";
import { DriverFormFields } from "./DriverFormFields";

/** Dedicated driver form; UI stays separate from validation and mutation behavior. */
export function DriverForm(props: DriverFormProps) {
  const editing = props.mode === "edit";
  const { form, status, setStatus, submitting, error, errorFor, change, blur, submit, requirements, requirementValues, requirementErrors, changeRequirement } = useDriverForm(props);
  return <Paper component="section" sx={{ border: 0, borderRadius: 1.5, overflow: "hidden" }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
      {editing ? <EditOutlinedIcon sx={{ fontSize: 20, color: "#64748b" }} /> : <PersonAddAlt1RoundedIcon sx={{ fontSize: 20, color: "#64748b" }} />}
      <Typography component="h1" sx={{ fontSize: 17, fontWeight: 700 }}>{editing ? "Edit driver" : "Add driver"}</Typography>
    </Box>
    <Box component="form" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }} sx={{ p: { xs: 2, sm: 3 } }}>
      <Alert severity="info" sx={{ mb: 3, fontSize: 12.5 }}>
        {editing ? "Updates apply to the WhatsApp bot immediately. A changed phone number must be verified again." : "Register the driver's contact and vehicle details. The driver can verify their number by replying on WhatsApp."}
      </Alert>
      <DriverFormFields mode={props.mode} form={form} status={status} onStatusChange={setStatus} errorFor={errorFor} onChange={change} onBlur={blur} disabled={submitting} />
      {!editing && (requirements.loading ? <SectionPreloader label="Checking registration requirements…" /> : <Box sx={{ mt: 3 }}>
        {(requirements.fields.length > 0 || requirements.notices.length > 0) && <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, mb: 2 }}>Registration requirements</Typography>}
        <RequirementFields fields={requirements.fields} notices={requirements.notices} values={requirementValues} onChange={changeRequirement} errors={requirementErrors} disabled={submitting} />
      </Box>)}
      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 4, pt: 2.5, borderTop: "1px solid #eef0f4" }}>
        <Button component={Link} href="/drivers" variant="outlined" disabled={submitting}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={submitting || requirements.loading} startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {submitting ? (editing ? "Saving…" : "Adding…") : editing ? "Save changes" : "Add driver"}
        </Button>
      </Box>
    </Box>
  </Paper>;
}
