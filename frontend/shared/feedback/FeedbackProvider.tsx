"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { FeedbackDialog } from "../components/FeedbackDialog";
import { feedbackStore, dismissMessage } from "./store";
import { ToastItem } from "./ToastItem";

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(feedbackStore.subscribe, feedbackStore.getSnapshot, feedbackStore.getServerSnapshot);
  const message = state.dialogs[0];
  return <>{children}
    <Box sx={{ position: "fixed", top: { xs: 12, sm: 20 }, right: { xs: 12, sm: 20 }, width: 360, maxWidth: "calc(100vw - 24px)", display: "flex", flexDirection: "column", gap: 1.5, pointerEvents: "none", zIndex: theme => theme.zIndex.snackbar }}>
      {state.toasts.map(toast => <ToastItem key={toast.id} toast={toast} />)}
    </Box>
    {message && <FeedbackDialog open title={message.title} message={message.message} severity={message.severity} confirmation={message.confirmation} confirmLabel={message.confirmLabel} onClose={() => dismissMessage(message.id)} onConfirm={() => dismissMessage(message.id, true)} />}
  </>;
}
