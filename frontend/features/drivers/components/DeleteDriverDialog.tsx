"use client";
import { FeedbackDialog } from "@/shared/components/FeedbackDialog";
import type { Driver } from "../types";

export function DeleteDriverDialog({ driver, deleting, onCancel, onConfirm }: { driver: Driver | null; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <FeedbackDialog open={driver !== null} title="Delete this driver?" message={driver ? `Remove ${driver.name} and all of their conversations, requests and assignments? This cannot be undone.` : ""} severity="error" confirmation confirmLabel="Delete driver" pending={deleting} onClose={onCancel} onConfirm={onConfirm} />;
}
