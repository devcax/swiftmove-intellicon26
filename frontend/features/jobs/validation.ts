import { ApiError } from "@/shared/api/client";
import { createJobSchema, editJobSchema, type JobFormErrors, type JobFormField, type JobFormValues } from "./schemas";

const FIELDS: JobFormField[] = [
  "jobNumber", "pickupLocation", "deliveryLocation", "pickupAt", "deliveryAt", "cargo", "quantity", "unit", "customUnit", "pickupLatitude", "pickupLongitude", "deliveryLatitude", "deliveryLongitude", "instructions", "pickupCode", "deliveryCode",
];

function firstProblems(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }): JobFormErrors {
  const errors: JobFormErrors = {};
  if (result.success || !result.error) return errors;
  for (const issue of result.error.issues) {
    const field = issue.path[0] as JobFormField;
    if (FIELDS.includes(field) && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** The first problem of each field of a new job. An empty object means the form is valid. */
export const validateCreateJob = (values: JobFormValues): JobFormErrors => firstProblems(createJobSchema().safeParse(values));

export const validateEditJob = (values: JobFormValues): JobFormErrors => firstProblems(editJobSchema.safeParse(values));

/** Field problems the server reported (it names fields as the form does), to show next to the matching field. */
export function serverFieldErrors(err: unknown): JobFormErrors {
  const errors: JobFormErrors = {};
  if (!(err instanceof ApiError)) return errors;
  for (const detail of err.details) {
    const field = detail.path as JobFormField;
    if (FIELDS.includes(field) && !errors[field]) errors[field] = detail.message;
  }
  return errors;
}
