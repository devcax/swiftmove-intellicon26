"use client";

import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { RequirementFields } from "@/shared/components/RequirementFields";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { useCreateJobForm } from "../hooks/useCreateJobForm";
import type { ApiJobSummary } from "../types";
import { JobFormFields } from "./JobFormFields";
import { JobFormLayout } from "./JobFormLayout";

export function CreateJobForm({ onCreated }: { onCreated: (job: ApiJobSummary) => void }) {
  const state = useCreateJobForm(onCreated);
  return <JobFormLayout title="Create job" guidance="Publishing makes the job available to matching drivers. Share pickup and delivery security codes with site staff only." busy={state.submitting} disabled={!state.isValid || state.requirements.loading} onSubmit={state.submit}>
    <JobFormFields mode="create" values={state.form} errors={state.shownErrors} minPickupAt={state.minPickupAt} disabled={state.submitting} onChange={state.change} onLocationChange={state.setLocation} />
    {state.requirements.loading ? <SectionPreloader label="Checking publication requirements…" /> : <>
      {(state.requirements.fields.length > 0 || state.requirements.notices.length > 0) && <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>Publication requirements</Typography>}
      <RequirementFields fields={state.requirements.fields} notices={state.requirements.notices} values={state.requirementValues} onChange={state.changeRequirement} errors={state.requirementErrors} disabled={state.submitting} />
    </>}
    {state.error && <Alert severity="error">{state.error}</Alert>}
  </JobFormLayout>;
}
