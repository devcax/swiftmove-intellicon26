"use client";

import * as React from "react";
import { describeError } from "@/shared/api/describeError";
import { notifyDataChanged } from "@/shared/hooks/dataChanged";
import { feedback } from "@/shared/feedback/store";
import { fromLocalInput, formCoordinates, resolvedUnit } from "../listing";
import type { GeoPoint } from "@/shared/types/location";
import { EMPTY_JOB_FORM, type JobFormErrors, type JobFormField, type JobFormValues } from "../schemas";
import { serverFieldErrors } from "../validation";
import type { ApiJobSummary } from "../types";

import { fetchJob, updateJob } from "../api";
import { units } from "../constants";
import { toLocalInput } from "../listing";
import { validateEditJob } from "../validation";

export function useEditJobForm(jobId: string, onSaved: (job: ApiJobSummary) => void) {
  const [form, setForm] = React.useState<JobFormValues>(EMPTY_JOB_FORM);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState<JobFormErrors>({});
  const [error, setError] = React.useState<string | null>(null);
  const [editable, setEditable] = React.useState(false);
  const [jobNumber, setJobNumber] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (!jobId) return undefined;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchJob(jobId);
        if (cancelled) return;
        setEditable(["DRAFT", "PUBLISHED"].includes(detail.status));
        setJobNumber(detail.jobNumber);
        const pickup = detail.stops.find((s) => s.type === "PICKUP");
        const delivery = detail.stops.find((s) => s.type === "DELIVERY");
        const item = detail.items[0];
        setForm({
          ...EMPTY_JOB_FORM,
          jobNumber: detail.jobNumber,
          pickupCode: detail.pickupCode ?? "",
          deliveryCode: detail.deliveryCode ?? "",
          pickupLocation: pickup?.name ?? "",
          deliveryLocation: delivery?.name ?? "",
          pickupAt: toLocalInput(detail.pickupAt),
          deliveryAt: toLocalInput(detail.deliveryAt),
          cargo: detail.cargo ?? "",
          quantity: item?.quantityValue != null ? String(item.quantityValue) : "",
          unit: units.find((u) => u !== "Other" && u.toLowerCase() === String(item?.unit ?? "").toLowerCase()) ?? (item?.unit ? "Other" : "Pallets"),
          customUnit: item?.unit ?? "",
          pickupLatitude: pickup?.latitude != null ? String(pickup.latitude) : "",
          pickupLongitude: pickup?.longitude != null ? String(pickup.longitude) : "",
          deliveryLatitude: delivery?.latitude != null ? String(delivery.latitude) : "",
          deliveryLongitude: delivery?.longitude != null ? String(delivery.longitude) : "",
          instructions: detail.specialInstructions ?? "",
        });
      } catch (err) {
        if (cancelled) return;
        setError(describeError(err, "Could not load the job details. Please try again."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, attempt]);

  const errors = validateEditJob(form);
  const isValid = Object.keys(errors).length === 0;

  const change = (field: JobFormField) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    if (!jobId || saving || !editable) return;
    const currentErrors = validateEditJob(form);
    if (Object.keys(currentErrors).length) { setServerErrors(currentErrors); return; }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateJob(jobId, {
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
      });
      notifyDataChanged();
      feedback.success(`${updated.jobNumber} was updated.`);
      onSaved(updated);
    } catch (err) {
      feedback.error(describeError(err, "Could not update the job."));
      const fieldErrors = serverFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setServerErrors(fieldErrors);
      else setError(describeError(err, "Could not update the job. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const setLocation = (stage: "pickup" | "delivery", point: GeoPoint, address: string) => {
    setForm((current) => ({ ...current, [`${stage}Location`]: address, [`${stage}Latitude`]: point.latitude.toFixed(6), [`${stage}Longitude`]: point.longitude.toFixed(6) }));
    setServerErrors((current) => ({ ...current, [`${stage}Location`]: undefined, [`${stage}Latitude`]: undefined, [`${stage}Longitude`]: undefined }));
  };
  return { form, shownErrors: { ...errors, ...serverErrors }, isValid, loading, saving, error, change, submit, editable, jobNumber, setLocation, retry: () => setAttempt((value) => value + 1) };
}
