import { request } from "./client";

const MAX_CHARS = 2000;

/**
 * Tell the backend a screen crashed so it lands in the logs. Fire and forget: reporting must never make a crash
 * worse, so every failure here is swallowed. The text goes to the log only, never to the person.
 */
export function reportClientError(error: Error & { digest?: string }): void {
  if (typeof window === "undefined") return;
  void request("/api/client-errors", {
    method: "POST",
    redirectOn401: false,
    body: JSON.stringify({
      message: String(error?.message ?? "Unknown error").slice(0, MAX_CHARS),
      path: window.location.pathname.slice(0, MAX_CHARS),
      ...(error?.digest ? { digest: error.digest } : {}),
    }),
  }).catch(() => undefined);
}
