"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { EmptyState } from "@/shared/components/EmptyState";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { useEditJobForm } from "../hooks/useEditJobForm";
import type { ApiJobSummary } from "../types";
import { JobFormFields } from "./JobFormFields";
import { JobFormLayout } from "./JobFormLayout";

export function EditJobForm({ jobId, onSaved }: { jobId: string; onSaved: (job: ApiJobSummary) => void }) {
  const state = useEditJobForm(jobId, onSaved);
  if (state.loading) return <Paper sx={{ p: 3, border: 0 }}><SectionPreloader label="Loading job details…" /></Paper>;
  if (!state.editable) return <Paper sx={{ p: 3, border: 0 }}>
    {state.error ? <Alert severity="error" action={<Button color="inherit" onClick={state.retry}>Retry</Button>}>{state.error}</Alert>
      : <EmptyState title="This job cannot be edited" description="Only draft and published jobs can be edited. Return to job management to view its current status." />}
  </Paper>;
  return <JobFormLayout title={`Edit ${state.jobNumber}`} guidance="Only draft and published jobs can be edited. Security codes remain unchanged." editing busy={state.saving} disabled={!state.isValid} onSubmit={state.submit}>
    <JobFormFields mode="edit" values={state.form} errors={state.shownErrors} disabled={state.saving} onChange={state.change} onLocationChange={state.setLocation} />
    {state.error && <Alert severity="error">{state.error}</Alert>}
  </JobFormLayout>;
}
