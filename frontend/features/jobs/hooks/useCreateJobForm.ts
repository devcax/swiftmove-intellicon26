"use client";

import * as React from "react";
import { describeError } from "@/shared/api/describeError";
import { notifyDataChanged } from "@/shared/hooks/dataChanged";
import { fromLocalInput, formCoordinates, resolvedUnit } from "../listing";
import type { GeoPoint } from "@/shared/types/location";
import { EMPTY_JOB_FORM, type JobFormErrors, type JobFormField, type JobFormValues } from "../schemas";
import { serverFieldErrors } from "../validation";
import type { ApiJobSummary } from "../types";

import { ApiError } from "@/shared/api/client";
import { useRequirements } from "@/shared/hooks/useRequirements";
import { blockedRequirement, isCollectable, missingRequirements, newEvidenceRef, recordRequirements, type RequirementErrors, type RequirementValue, type RequirementValues } from "@/features/evidence/values";
import { createJob, fetchJobIdentifiers } from "../api";
import { feedback } from "@/shared/feedback/store";
import { localIdentifiers } from "../listing";
import { validateCreateJob } from "../validation";

export function useCreateJobForm(onCreated: (job: ApiJobSummary) => void) {
  const [form, setForm] = React.useState<JobFormValues>(EMPTY_JOB_FORM);
  const [serverErrors, setServerErrors] = React.useState<JobFormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requirements = useRequirements("job.create", true);
  const [requirementValues, setRequirementValues] = React.useState<RequirementValues>({});
  const [requirementErrors, setRequirementErrors] = React.useState<RequirementErrors>({});
  const [evidenceRef, setEvidenceRef] = React.useState(newEvidenceRef);

  // A fresh job number and codes, made on the server (or here when it cannot be reached).
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      let ids;
      try {
        ids = await fetchJobIdentifiers();
      } catch {
        ids = localIdentifiers();
      }
      if (!cancelled) setForm((current) => ({ ...current, ...ids }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = validateCreateJob(form);
  const isValid = Object.keys(errors).length === 0;
  const shownErrors: JobFormErrors = { ...errors, ...serverErrors };

  const change = (field: JobFormField) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  };

  const changeRequirement = (name: string, value: RequirementValue) => {
    setRequirementValues((current) => ({ ...current, [name]: value }));
    setRequirementErrors((current) => ({ ...current, [name]: undefined }));
  };

  const reset = () => {
    setForm(EMPTY_JOB_FORM);
    setServerErrors({});
    setRequirementValues({});
    setRequirementErrors({});
    setEvidenceRef(newEvidenceRef());
    setError(null);
  };

  const submit = async () => {
    if (submitting || requirements.loading) return;
    const currentErrors = validateCreateJob(form);
    if (Object.keys(currentErrors).length) { setServerErrors(currentErrors); return; }
    const missing = missingRequirements(requirements.fields, requirementValues);
    if (Object.keys(missing).length > 0) {
      setRequirementErrors(missing);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (requirements.fields.some(isCollectable)) await recordRequirements(evidenceRef, requirements.fields, requirementValues);
      const created = await createJob({
        jobNumber: form.jobNumber || undefined,
        pickupLocation: form.pickupLocation.trim(),
        deliveryLocation: form.deliveryLocation.trim(),
        pickupAt: fromLocalInput(form.pickupAt),
        deliveryAt: fromLocalInput(form.deliveryAt),
        cargo: form.cargo.trim(),
        quantity: form.quantity.trim(),
        unit: resolvedUnit(form),
        pickupCoordinates: formCoordinates(form, "pickup"),
        deliveryCoordinates: formCoordinates(form, "delivery"),
        instructions: form.instructions.trim() || undefined,
        pickupCode: form.pickupCode || undefined,
        deliveryCode: form.deliveryCode || undefined,
        status: "PUBLISHED",
        evidenceRef,
      });
      notifyDataChanged();
      feedback.success(`${created.jobNumber} was created.`);
      onCreated(created);
      reset();
    } catch (err) {
      feedback.error(describeError(err, "Could not create the job."));
      const fieldErrors = serverFieldErrors(err);
      const blocked = blockedRequirement(err, requirements.fields.map((field) => field.name));
      if (blocked) setRequirementErrors({ [blocked]: err instanceof ApiError ? err.message : "This is required." });
      else if (Object.keys(fieldErrors).length > 0) setServerErrors(fieldErrors);
      else setError(describeError(err, "Could not save the job. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };


  const setLocation = (stage: "pickup" | "delivery", point: GeoPoint, address: string) => {
    setForm((current) => ({ ...current, [`${stage}Location`]: address, [`${stage}Latitude`]: point.latitude.toFixed(6), [`${stage}Longitude`]: point.longitude.toFixed(6) }));
    setServerErrors((current) => ({ ...current, [`${stage}Location`]: undefined, [`${stage}Latitude`]: undefined, [`${stage}Longitude`]: undefined }));
  };
  return { form, shownErrors, isValid, submitting, error, change, submit, requirements, requirementValues, requirementErrors, changeRequirement, setLocation };
}
