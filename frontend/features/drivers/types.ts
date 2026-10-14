import type { z } from "zod";
import type { driverFormSchema, driverPayloadSchema, driverSchema, driverStatusSchema } from "./schemas";

export type Driver = z.infer<typeof driverSchema>;
export type DriverStatus = z.infer<typeof driverStatusSchema>;
export type DriverPayload = z.infer<typeof driverPayloadSchema>;
export type DriverFormValues = z.infer<typeof driverFormSchema>;
export type DriverFormField = keyof DriverFormValues;
export type DriverFormErrors = Partial<Record<DriverFormField, string>>;
