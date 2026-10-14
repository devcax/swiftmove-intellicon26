import { request } from "@/shared/api/client";

export type ActivationState = "ready" | "verified" | "expired";
export interface ActivationInfo { state: ActivationState; firstName: string }

const path = (token: string) => `/api/public/driver-activation/${encodeURIComponent(token)}`;

/** What the link is right now. Opening a link never verifies anything: only pressing the button does. */
export const lookupActivation = (token: string) => request<ActivationInfo>(path(token), { redirectOn401: false });

export const confirmActivation = (token: string) => request<ActivationInfo>(path(token), { method: "POST", body: "{}", redirectOn401: false });
