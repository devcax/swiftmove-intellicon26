"use client";

import * as React from "react";
import { onDataChanged } from "./dataChanged";

/**
 * Call `fn` now and then every `intervalMs`, for as long as the component is mounted.
 *  - Pauses while the browser tab is hidden, and refreshes at once when it becomes visible again.
 *  - Never runs two calls at the same time: a tick that arrives while one is running is skipped.
 *  - On unmount the timer stops and the signal given to `fn` is aborted, so a late answer can be ignored.
 * Returns `refresh`, which runs `fn` immediately (still never overlapping a running call).
 */
export function usePolling(fn: (signal: AbortSignal) => Promise<void>, intervalMs: number): { refresh: () => Promise<void> } {
  const latest = React.useRef(fn);
  // The call in flight. An object, so a call that finishes late cannot clear a newer call's marker.
  const running = React.useRef<{ promise: Promise<void> } | null>(null);
  const controller = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    latest.current = fn;
  });

  const run = React.useCallback((): Promise<void> => {
    if (running.current) return running.current.promise;
    const signal = controller.current?.signal;
    if (!signal || signal.aborted) return Promise.resolve();
    const entry: { promise: Promise<void> } = { promise: Promise.resolve() };
    entry.promise = latest.current(signal).finally(() => {
      if (running.current === entry) running.current = null;
    });
    running.current = entry;
    return entry.promise;
  }, []);

  React.useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void run();
    };
    tick();
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    // Something was changed elsewhere (the manager chat): reload now.
    const stopListening = onDataChanged(tick);
    return () => {
      abort.abort();
      // React Strict Mode mounts, unmounts and mounts again: the remount must start its own call, not reuse
      // this one, whose answer will be ignored because its signal is aborted.
      running.current = null;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      stopListening();
    };
  }, [intervalMs, run]);

  return { refresh: run };
}
