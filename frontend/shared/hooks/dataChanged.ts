/**
 * A tiny signal for "something changed on the server, reload what you show". The manager chat sends it after an action succeeded;
 * every list that polls (usePolling) reloads at once instead of waiting for its next tick.
 */
const EVENT = "fleet:data-changed";

export function notifyDataChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Listen for the signal. Returns the function that stops listening. */
export function onDataChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
