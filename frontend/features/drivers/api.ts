import { request } from "@/shared/api/client";
import {
  deleteDriverResultSchema, driverListSchema, driverSchema, driverProfileSchema, type driverPayloadSchema,
} from "./schemas";
import type { z } from "zod";
import type { Driver, DriverPayload, DriverStatus } from "./types";

type Payload = z.input<typeof driverPayloadSchema>;
const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export async function fetchDrivers(): Promise<Driver[]> {
  return driverListSchema.parse(await request<unknown>("/api/drivers"));
}

export async function fetchDriver(id: string, signal?: AbortSignal): Promise<Driver> {
  return driverSchema.parse(await request<unknown>(`/api/drivers/${encodeURIComponent(id)}`, { signal }));
}

export async function fetchDriverProfile(id: string) {
  return driverProfileSchema.parse(await request<unknown>(`/api/drivers/${encodeURIComponent(id)}/profile`));
}

export async function createDriver(payload: Payload): Promise<Driver> {
  return driverSchema.parse(await request<unknown>("/api/drivers", { method: "POST", ...json(payload) }));
}

export async function updateDriver(id: string, payload: DriverPayload & { status: DriverStatus }): Promise<Driver> {
  return driverSchema.parse(await request<unknown>(`/api/drivers/${id}`, { method: "PATCH", ...json(payload) }));
}

export async function updateDriverStatus(id: string, status: DriverStatus): Promise<Driver> {
  return driverSchema.parse(await request<unknown>(`/api/drivers/${id}/status`, { method: "PATCH", ...json({ status }) }));
}

export async function deleteDriver(id: string): Promise<{ ok: boolean; id: string; name: string }> {
  return deleteDriverResultSchema.parse(await request<unknown>(`/api/drivers/${id}`, { method: "DELETE" }));
}

export async function resendDriverActivation(id: string): Promise<void> {
  await request<unknown>(`/api/drivers/${encodeURIComponent(id)}/activation`, { method: "POST", body: "{}" });
}
