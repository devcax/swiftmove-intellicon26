import { z } from "zod";
import { MAX_DELIVERY_WINDOW_MS } from "./constants";

/** The job form as the person fills it in (strings, as the inputs hold them; dates are the browser's local "datetime-local" text). */
export interface JobFormValues {
  jobNumber: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupAt: string;
  deliveryAt: string;
  cargo: string;
  quantity: string;
  unit: string;
  customUnit: string;
  pickupLatitude: string;
  pickupLongitude: string;
  deliveryLatitude: string;
  deliveryLongitude: string;
  instructions: string;
  pickupCode: string;
  deliveryCode: string;
}

export type JobFormField = keyof JobFormValues;
export type JobFormErrors = Partial<Record<JobFormField, string>>;

export const EMPTY_JOB_FORM: JobFormValues = {
  jobNumber: "", pickupLocation: "", deliveryLocation: "", pickupAt: "", deliveryAt: "", cargo: "", quantity: "", unit: "Pallets", instructions: "",
  pickupCode: "", deliveryCode: "",
  customUnit: "", pickupLatitude: "", pickupLongitude: "", deliveryLatitude: "", deliveryLongitude: "",
};

const required = (message: string) => z.string().trim().min(1, message);
const instant = (text: string) => (text ? new Date(text).getTime() : NaN);

/** The delivery must be after the pickup and within two days of it. Used by both forms. */
function checkWindow(values: { pickupAt: string; deliveryAt: string }, ctx: z.RefinementCtx) {
  const pickup = instant(values.pickupAt);
  const delivery = instant(values.deliveryAt);
  if (Number.isNaN(pickup) || Number.isNaN(delivery)) return;
  if (delivery <= pickup) ctx.addIssue({ code: "custom", path: ["deliveryAt"], message: "Delivery must be after the pickup time" });
  else if (delivery > pickup + MAX_DELIVERY_WINDOW_MS) ctx.addIssue({ code: "custom", path: ["deliveryAt"], message: "Delivery must be within 2 days of pickup" });
}

const coordinate = (limit: number) => z.string().min(1, "Select a pin on the map").refine((value) => value.trim() !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit, "Select a valid map location");
const routeAndCargo = {
  pickupLocation: required("Enter the pickup location name"), deliveryLocation: required("Enter the delivery location name"),
  pickupLatitude: coordinate(90), pickupLongitude: coordinate(180), deliveryLatitude: coordinate(90), deliveryLongitude: coordinate(180),
  cargo: required("Describe the cargo"), unit: required("Choose a unit"), customUnit: z.string(),
};
const date = (message: string) => required(message).refine((value) => Number.isFinite(instant(value)), "Enter a valid date and time");
function checkCustomUnit(values: { unit: string; customUnit: string }, ctx: z.RefinementCtx) {
  if (values.unit === "Other" && (!values.customUnit.trim() || values.customUnit.trim().length > 60 || values.customUnit.trim().toLowerCase() === "other")) {
    ctx.addIssue({ code: "custom", path: ["customUnit"], message: "Enter a unit name of 1–60 characters" });
  }
}

/** What a new job needs. A pickup later today is fine: it only cannot be earlier than the current minute (the form picks whole minutes). */
export function createJobSchema() {
  return z.object({
    ...routeAndCargo,
    pickupAt: date("Choose the pickup time").superRefine((value, ctx) => {
      if (instant(value) < Math.floor(Date.now() / 60000) * 60000) ctx.addIssue({ code: "custom", message: "Pickup cannot be in the past" });
    }),
    deliveryAt: date("Choose the delivery time"),
    quantity: required("Enter the quantity"),
  }).loose().superRefine(checkWindow).superRefine(checkCustomUnit);
}

/** Edited jobs must also have a future pickup and a valid delivery window. */
export const editJobSchema = z.object({
  ...routeAndCargo,
  pickupAt: date("Choose the pickup time").refine((value) => instant(value) >= Math.floor(Date.now() / 60000) * 60000, "Pickup cannot be in the past"),
  deliveryAt: date("Choose the delivery time"),
}).loose().superRefine(checkWindow).superRefine(checkCustomUnit);
