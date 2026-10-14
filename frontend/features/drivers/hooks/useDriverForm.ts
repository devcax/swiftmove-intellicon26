"use client";

import { useState, type ChangeEvent } from "react";
import { ApiError } from "@/shared/api/client";
import { describeError } from "@/shared/api/describeError";
import { notifyDataChanged } from "@/shared/hooks/dataChanged";
import { feedback } from "@/shared/feedback/store";
import { useRequirements } from "@/shared/hooks/useRequirements";
import { blockedRequirement, isCollectable, missingRequirements, newEvidenceRef, recordRequirements, type RequirementErrors, type RequirementValue, type RequirementValues } from "@/features/evidence/values";
import { createDriver, updateDriver } from "../api";
import { formatPhoneInput, formatPlateInput, toE164 } from "../format";
import { serverFieldErrors, validateDriverForm } from "../validation";
import type { Driver, DriverFormErrors, DriverFormField, DriverFormValues, DriverStatus } from "../types";

export interface DriverFormProps {
  mode: "create" | "edit";
  driver?: Driver;
  existingPhones: string[];
  onSaved: (driver: Driver) => void;
}

/** Registration and editing share field validation, duplicate checks, and evidence collection. */
export function useDriverForm({ mode, driver, existingPhones, onSaved }: DriverFormProps) {
  const editing = mode === "edit";
  const [form, setForm] = useState<DriverFormValues>(() => driver ? {
    fullName: driver.name, phone: formatPhoneInput(driver.phone), vehicleType: driver.vehicleType ?? "", licensePlate: driver.licensePlate ?? "",
  } : { fullName: "", phone: "", vehicleType: "", licensePlate: "" });
  const [status, setStatus] = useState<DriverStatus>(driver?.status ?? "ACTIVE");
  const [touched, setTouched] = useState<Partial<Record<DriverFormField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<DriverFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requirements = useRequirements("driver.create", !editing);
  const [requirementValues, setRequirementValues] = useState<RequirementValues>({});
  const [requirementErrors, setRequirementErrors] = useState<RequirementErrors>({});
  const [evidenceRef] = useState(newEvidenceRef);
  const errors = validateDriverForm(form);
  const errorFor = (field: DriverFormField) => serverErrors[field] ?? (touched[field] ? errors[field] : undefined);
  const change = (field: DriverFormField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = event.target.value;
    const value = field === "phone" ? formatPhoneInput(raw) : field === "licensePlate" ? formatPlateInput(raw) : raw;
    setForm((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
    if (field === "vehicleType") setTouched((current) => ({ ...current, vehicleType: true }));
  };
  const blur = (field: DriverFormField) => () => setTouched((current) => ({ ...current, [field]: true }));
  const changeRequirement = (name: string, value: RequirementValue) => {
    setRequirementValues((current) => ({ ...current, [name]: value }));
    setRequirementErrors((current) => ({ ...current, [name]: undefined }));
  };
  const submit = async () => {
    if (submitting || requirements.loading) return;
    setError(null);
    setTouched({ fullName: true, phone: true, vehicleType: true, licensePlate: true });
    if (Object.keys(errors).length) return;
    const phone = toE164(form.phone);
    if (!phone || (editing && !driver)) return;
    if (existingPhones.some((other) => other.replace(/\D/g, "") === phone.replace(/\D/g, ""))) {
      setServerErrors({ phone: "A driver with this phone number is already registered." });
      return;
    }
    if (!editing) {
      const missing = missingRequirements(requirements.fields, requirementValues);
      if (Object.keys(missing).length) { setRequirementErrors(missing); return; }
    }
    setSubmitting(true);
    const payload = { name: form.fullName.trim(), phone, vehicleType: form.vehicleType, licensePlate: form.licensePlate.trim().toUpperCase() };
    try {
      if (!editing && requirements.fields.some(isCollectable)) await recordRequirements(evidenceRef, requirements.fields, requirementValues);
      const saved = editing && driver ? await updateDriver(driver.id, { ...payload, status }) : await createDriver({ ...payload, evidenceRef });
      notifyDataChanged();
      feedback.success(editing ? `${saved.name} was updated.` : `${saved.name} was added.`);
      onSaved(saved);
    } catch (err) {
      feedback.error(describeError(err, editing ? "Could not update the driver." : "Could not add the driver."));
      const fields = serverFieldErrors(err);
      const blocked = blockedRequirement(err, requirements.fields.map((field) => field.name));
      if (blocked) setRequirementErrors({ [blocked]: err instanceof ApiError ? err.message : "This is required." });
      else if (Object.keys(fields).length) setServerErrors(fields);
      else setError(describeError(err, editing ? "Could not update the driver." : "Could not add the driver."));
    } finally { setSubmitting(false); }
  };
  return { form, status, setStatus, submitting, error, errorFor, change, blur, submit, requirements, requirementValues, requirementErrors, changeRequirement };
}
