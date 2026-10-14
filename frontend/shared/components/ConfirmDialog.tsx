"use client";
import { useRef, useState } from "react";
import { FeedbackDialog } from "./FeedbackDialog";
import { feedback, type FeedbackSeverity } from "../feedback/store";

export interface Confirmation {
  title: string; body: string; action: () => Promise<void> | void;
  severity?: FeedbackSeverity; confirmLabel?: string;
}

/** Existing confirmation callers share the same visual, busy state and error handling. */
export function ConfirmDialog({ confirm, onClose }: { confirm: Confirmation | null; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const accept = async () => {
    if (!confirm || running.current) return;
    running.current = true;
    setPending(true); setError(null);
    try { await confirm.action(); onClose(); }
    catch (err) { const message = err instanceof Error ? err.message : "The action failed. Please try again."; setError(message); feedback.error(message); }
    finally { running.current = false; setPending(false); }
  };
  return <FeedbackDialog open={Boolean(confirm)} title={confirm?.title ?? "Are you sure?"} message={confirm?.body} severity={confirm?.severity ?? "warning"} confirmation confirmLabel={confirm?.confirmLabel} pending={pending} error={error} onClose={() => { setError(null); onClose(); }} onConfirm={() => void accept()} />;
}
