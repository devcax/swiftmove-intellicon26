import { ApiError } from "@/shared/api/client";
import type { RequirementField } from "@/shared/api/requirements";
import { recordEvidence, uploadEvidenceFile } from "./api";

/** What the person entered for one required item. Only the part that fits the item's type is used. */
export interface RequirementValue {
  file?: File | null;
  confirmed?: boolean;
  text?: string;
  lat?: string;
  lng?: string;
}

export type RequirementValues = Record<string, RequirementValue | undefined>;
export type RequirementErrors = Record<string, string | undefined>;

/** The types this screen can collect. Anything else is shown as a notice and left to the server. */
export const COLLECTABLE_TYPES = ["DOCUMENT", "CONFIRMATION", "TEXT", "LOCATION"];

export const isCollectable = (field: RequirementField) => COLLECTABLE_TYPES.includes(field.type);

const toNumber = (raw: string | undefined) => (raw === undefined || raw.trim() === "" ? NaN : Number(raw));

/** A message for every required item the person has not filled in (or filled in wrongly). Empty means ready to submit. */
export function missingRequirements(fields: RequirementField[], values: RequirementValues): RequirementErrors {
  const errors: RequirementErrors = {};
  for (const field of fields.filter(isCollectable)) {
    const value = values[field.name] ?? {};
    if (field.type === "DOCUMENT" && !value.file) errors[field.name] = `Upload the ${field.label}.`;
    if (field.type === "CONFIRMATION" && !value.confirmed) errors[field.name] = "Tick the box to confirm.";
    if (field.type === "TEXT" && !value.text?.trim()) errors[field.name] = `Add the ${field.label}.`;
    if (field.type === "LOCATION") {
      const lat = toNumber(value.lat);
      const lng = toNumber(value.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) errors[field.name] = "Enter both latitude and longitude.";
      else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) errors[field.name] = "Those coordinates are not valid.";
    }
  }
  return errors;
}

/**
 * Record each collected item as evidence under `evidenceRef` (a PENDING reference), uploading files first. The action that
 * follows is sent the same `evidenceRef`, and the server moves the evidence onto the record it creates.
 */
export async function recordRequirements(evidenceRef: string, fields: RequirementField[], values: RequirementValues): Promise<void> {
  for (const field of fields.filter(isCollectable)) {
    const value = values[field.name] ?? {};
    const common = { subjectType: "PENDING" as const, subjectId: evidenceRef, name: field.name, type: field.type };
    if (field.type === "DOCUMENT" && value.file) {
      await recordEvidence({ ...common, attachmentId: await uploadEvidenceFile(value.file) });
    } else if (field.type === "CONFIRMATION") {
      await recordEvidence({ ...common, value: { confirmed: true } });
    } else if (field.type === "TEXT") {
      await recordEvidence({ ...common, value: { text: (value.text ?? "").trim() } });
    } else if (field.type === "LOCATION") {
      await recordEvidence({ ...common, value: { lat: Number(value.lat), lng: Number(value.lng) } });
    }
  }
}

/** The required item a policy block is about (it comes back as 422 POLICY_BLOCKED naming the evidence), if the form shows it. */
export function blockedRequirement(err: unknown, shownNames: string[]): string | null {
  if (!(err instanceof ApiError) || err.code !== "POLICY_BLOCKED") return null;
  const evidence = err.info?.evidence as { name?: string } | null | undefined;
  return evidence?.name && shownNames.includes(evidence.name) ? evidence.name : null;
}

/** A fresh reference for evidence collected before its record exists. Works over plain http too, where randomUUID is missing. */
export function newEvidenceRef(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
