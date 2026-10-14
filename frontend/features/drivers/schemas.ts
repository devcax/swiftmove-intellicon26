import { z } from "zod";

export const driverStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

/** A driver as the API returns it. Every response is parsed with this before the page sees it. */
export const driverSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  verified: z.boolean(),
  status: driverStatusSchema,
  currentJob: z.string().nullable(),
  completedTrips: z.number(),
  vehicleType: z.string().nullable(),
  licensePlate: z.string().nullable(),
  address: z.string().nullable().optional(), nic: z.string().nullable().optional(), dateOfBirth: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(), bankBranch: z.string().nullable().optional(),
  bankAccountHolder: z.string().nullable().optional(), bankAccountNumber: z.string().nullable().optional(),
});

export const driverListSchema = z.array(driverSchema);

export const driverProfileSchema = driverSchema.extend({
  createdAt: z.string(), activeJobId: z.string().nullable(),
  trips: z.array(z.object({
    id: z.string(), status: z.string(), assignedAt: z.string(),
    acceptedAt: z.string().nullable(), startedAt: z.string().nullable(),
    completedAt: z.string().nullable(), cancelledAt: z.string().nullable(),
    job: z.object({ id: z.string(), jobNumber: z.string(), currentStatus: z.string(), cargoDescription: z.string(), pickupAt: z.string() }),
  })),
});
export type DriverProfile = z.infer<typeof driverProfileSchema>;

export const deleteDriverResultSchema = z.object({ ok: z.boolean(), id: z.string(), name: z.string() });

/** What the API accepts when a driver is created or edited (the phone is already +94XXXXXXXXX). */
export const driverPayloadSchema = z.object({
  address: z.string().nullable().optional(), nic: z.string().nullable().optional(), dateOfBirth: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(), bankBranch: z.string().nullable().optional(),
  bankAccountHolder: z.string().nullable().optional(), bankAccountNumber: z.string().nullable().optional(),
  name: z.string(),
  phone: z.string(),
  vehicleType: z.string(),
  licensePlate: z.string(),
  status: driverStatusSchema.optional(),
  /** The reference under which evidence was collected before the driver existed (create only). */
  evidenceRef: z.string().optional(),
});

// ---------------------------------------------------------------------------
// The driver form, as the person fills it in. The messages are the ones the form has always shown.
// ---------------------------------------------------------------------------

const PLATE_PATTERN = /^[A-Z]{1,2} ?[A-Z]{1,3}-[0-9]{1,4}$/;

/** The part of a Sri Lankan number after +94 or a leading 0, at most 9 digits. */
export function subscriberDigits(raw: string): string {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("0094")) digits = digits.slice(4);
  else if (digits.startsWith("94")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
}

export const driverFormSchema = z.object({
  address: z.string().max(1000, "Use at most 1,000 characters.").default(""),
  nic: z.string().max(20, "Use at most 20 characters.").default(""),
  dateOfBirth: z.string().refine(value => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= today;
  }, "Enter a valid date of birth that is not in the future.").default(""),
  bankName: z.string().max(160, "Use at most 160 characters.").default(""),
  bankBranch: z.string().max(160, "Use at most 160 characters.").default(""),
  bankAccountHolder: z.string().max(160, "Use at most 160 characters.").default(""),
  bankAccountNumber: z.string().max(80, "Use at most 80 characters.").default(""),
  fullName: z.string().superRefine((value, ctx) => {
    const name = value.trim();
    if (name.length < 3) {
      ctx.addIssue({ code: "custom", message: "Enter the driver's full name (min. 3 characters)" });
    } else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) {
      ctx.addIssue({ code: "custom", message: "Name can only contain letters, spaces, apostrophes or hyphens" });
    }
  }),
  phone: z.string().superRefine((value, ctx) => {
    const digits = subscriberDigits(value);
    if (!digits) ctx.addIssue({ code: "custom", message: "Phone number is required" });
    else if (digits.length !== 9) ctx.addIssue({ code: "custom", message: "Enter all 9 digits after +94" });
    else if (!/^7\d{8}$/.test(digits)) ctx.addIssue({ code: "custom", message: "Mobile number must start with 7 (e.g. 77 123 4567)" });
  }),
  vehicleType: z.string().min(1, "Select a vehicle type"),
  otherVehicleType: z.string().default(""),
  licensePlate: z.string().superRefine((value, ctx) => {
    const plate = value.trim().toUpperCase();
    if (!plate) ctx.addIssue({ code: "custom", message: "License plate is required" });
    else if (!PLATE_PATTERN.test(plate)) ctx.addIssue({ code: "custom", message: "Use a format like ED-1234" });
  }),
}).superRefine((values, ctx) => {
  if (values.vehicleType !== "Other") return;
  const name = values.otherVehicleType.trim();
  if (!name) ctx.addIssue({ code: "custom", path: ["otherVehicleType"], message: "Enter the vehicle type name." });
  else if (name.length > 60) ctx.addIssue({ code: "custom", path: ["otherVehicleType"], message: "Use at most 60 characters." });
});
