// ---------------------------------------------------------------------------
// Pure helpers for the jobs list page: window formatting, datetime-local
// conversions, API-to-view mapping and locally-generated job identifiers.
// No React; every function depends only on its arguments.
// ---------------------------------------------------------------------------

import type { ApiJobIdentifiers, ApiJobSummary, Job } from "./types";
import { LOCAL_CODE_ALPHABET } from "./constants";
import type { JobFormValues } from "./schemas";
import type { GeoPoint } from "@/shared/types/location";

/** Human "pickup → delivery" window, or "Not scheduled" when both are empty. */
export function formatWindow(pickupAt: string | null, deliveryAt: string | null): string {
  const fmt = (value: string | null) =>
    value
      ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "-";
  if (!pickupAt && !deliveryAt) return "Not scheduled";
  return `${fmt(pickupAt)} → ${fmt(deliveryAt)}`;
}

/** Convert an ISO instant to a bare datetime-local value in the browser's zone. */
export function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A datetime-local input holds a bare wall clock ("2026-09-07T10:00") with no
// timezone, so it must be resolved to a real instant here - in the browser,
// where the user's timezone is - before it goes to the API.
export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

// Earliest pickup a manager can pick: the current minute, so a pickup later today is allowed.
export function nowLocalInput(): string {
  return toLocalInput(new Date(Math.floor(Date.now() / 60000) * 60000).toISOString());
}

export function formCoordinates(form: JobFormValues, stage: "pickup" | "delivery"): GeoPoint {
  return { latitude: Number(form[`${stage}Latitude`]), longitude: Number(form[`${stage}Longitude`]) };
}
export const resolvedUnit = (form: JobFormValues) => form.unit === "Other" ? form.customUnit.trim() : form.unit;

/** Map an API job summary onto the list page's view model. */
export function mapJob(job: ApiJobSummary): Job {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    pickupCode: job.pickupCode ?? null,
    deliveryCode: job.deliveryCode ?? null,
    status: job.status,
    assignmentStatus: job.assignmentStatus,
    origin: job.pickup ?? "—",
    destination: job.delivery ?? "—",
    window: formatWindow(job.pickupAt, job.deliveryAt),
    cargo: job.cargo ?? "General cargo",
    quantity: job.quantity ?? "—",
    driver: job.driver,
  };
}

/** The status to display: an assignment awaiting driver acceptance wins. */
export function latestStatus(job: Job): string {
  if (
    job.status === "MANAGER_APPROVED" &&
    job.assignmentStatus === "PENDING_DRIVER_ACCEPTANCE"
  ) {
    return job.assignmentStatus;
  }
  return job.status;
}

/** Random local job number + security codes for the create form before save. */
export function localIdentifiers(): ApiJobIdentifiers {
  const code = (prefix: string) =>
    `${prefix}-${Array.from({ length: 6 }, () => LOCAL_CODE_ALPHABET[Math.floor(Math.random() * LOCAL_CODE_ALPHABET.length)]).join("")}`;
  return {
    jobNumber: `JOB-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`,
    pickupCode: code("PU"),
    deliveryCode: code("DL"),
  };
}
