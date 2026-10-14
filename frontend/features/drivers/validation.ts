import { ApiError } from "@/shared/api/client";
import { driverFormSchema } from "./schemas";
import type { DriverFormErrors, DriverFormField, DriverFormValues } from "./types";

const FIELDS: DriverFormField[] = ["fullName", "phone", "vehicleType", "licensePlate"];

/** The first problem for each field, using the zod schema. An empty object means the form is valid. */
export function validateDriverForm(values: DriverFormValues): DriverFormErrors {
  const result = driverFormSchema.safeParse(values);
  const errors: DriverFormErrors = {};
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const field = issue.path[0] as DriverFormField;
    if (FIELDS.includes(field) && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

// The server names its fields as the API does; the form calls the name field "fullName".
const SERVER_FIELD: Record<string, DriverFormField> = {
  name: "fullName", phone: "phone", vehicleType: "vehicleType", licensePlate: "licensePlate",
};

/** Field problems the server reported, to show next to the matching field. Other details are ignored. */
export function serverFieldErrors(err: unknown): DriverFormErrors {
  const errors: DriverFormErrors = {};
  if (!(err instanceof ApiError)) return errors;
  for (const detail of err.details) {
    const field = SERVER_FIELD[detail.path];
    if (field && !errors[field]) errors[field] = detail.message;
  }
  return errors;
}
