"use client";
import { FeedbackDialog } from "@/shared/components/FeedbackDialog";

export function ClearDeleteDialog({ action, driver, pending, onClose, onConfirm }: { action: "clear" | "delete" | null; driver: string; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return <FeedbackDialog open={action !== null} title={action === "delete" ? "Delete this conversation?" : "Clear this conversation?"}
    message={action === "delete" ? `The conversation with ${driver} and all its messages will be permanently deleted. This cannot be undone.` : `All messages with ${driver} will be permanently deleted. The conversation itself stays. This cannot be undone.`}
    severity="error" confirmation confirmLabel={action === "delete" ? "Delete conversation" : "Clear messages"} pending={pending} onClose={onClose} onConfirm={onConfirm} />;
}
