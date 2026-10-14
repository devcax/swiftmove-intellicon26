import { ApiError } from "./client";

/**
 * Text to show a person when a call failed: the server's message, plus the request id they can quote to
 * support. Anything that is not an ApiError gets the fallback, never a technical message.
 */
export function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.requestId ? `${err.message} (reference ${err.requestId})` : err.message;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
